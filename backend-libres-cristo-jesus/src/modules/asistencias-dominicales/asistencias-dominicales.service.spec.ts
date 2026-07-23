import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';
import { Persona } from '../personas/persona.entity';
import { Red } from '../redes/red.entity';
import { Sede } from '../sedes/sede.entity';
import { AsistenciaDominical } from './asistencia-dominical.entity';
import { AsistenciasDominicalesService } from './asistencias-dominicales.service';
import { RegistroAsistenciaDominical } from './registro-asistencia-dominical.entity';

describe('AsistenciasDominicalesService', () => {
  let service: AsistenciasDominicalesService;

  const asistenciaDominicalRepo = { findOne: jest.fn() };
  const registroQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getRawMany: jest.fn(),
  };
  const exportQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const registroDominicalRepo = {
    findOneBy: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => registroQueryBuilder),
  };
  const sedeRepo = { findOneBy: jest.fn() };
  const redRepo = { findOneBy: jest.fn() };
  const personaRepo = {
    create: jest.fn((value: unknown) => value),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const asistencia = {
    id: 'asistencia-1',
    estado: EstadoAsistenciaDominical.ACTIVO,
    diaRegistro: DiaPredica.DOMINGO,
  } as AsistenciaDominical;

  beforeEach(async () => {
    jest.clearAllMocks();
    asistenciaDominicalRepo.findOne.mockResolvedValue(asistencia);
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      registroQueryBuilder,
    );
    registroQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    registroQueryBuilder.getRawMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsistenciasDominicalesService,
        {
          provide: getRepositoryToken(AsistenciaDominical),
          useValue: asistenciaDominicalRepo,
        },
        {
          provide: getRepositoryToken(RegistroAsistenciaDominical),
          useValue: registroDominicalRepo,
        },
        { provide: getRepositoryToken(Sede), useValue: sedeRepo },
        { provide: getRepositoryToken(Red), useValue: redRepo },
        { provide: getRepositoryToken(Persona), useValue: personaRepo },
      ],
    }).compile();

    service = module.get<AsistenciasDominicalesService>(
      AsistenciasDominicalesService,
    );
    jest.spyOn(service, 'getPublicByToken').mockResolvedValue(asistencia);
    jest
      .spyOn(service as never, 'getDiaPredicaFromDate')
      .mockReturnValue(DiaPredica.DOMINGO);
    jest
      .spyOn(service as never, 'getCurrentDateString')
      .mockReturnValue('2026-06-13');
  });

  it('registers an existing person by document and computes missing profile fields', async () => {
    const persona = {
      id: 'persona-1',
      documento: '1010',
      nombres: 'Ana',
      apellidos: 'Pérez',
      celular: null,
      departamento: null,
      ciudad: null,
      fechaNacimiento: null,
      idRed: null,
      red: null,
    } as Persona;

    personaRepo.findOne.mockResolvedValue(persona);
    registroDominicalRepo.findOneBy.mockResolvedValue(null);
    registroDominicalRepo.save.mockResolvedValue({ id: 'registro-1' });

    const result = await service.registrarPublico('valid-token', {
      documento: '1010',
    });

    expect(result).toMatchObject({
      alreadyRegistered: false,
      esNuevo: false,
      registroId: 'registro-1',
      missingFields: [
        'idRed',
        'fechaNacimiento',
        'celular',
        'departamento',
        'ciudad',
      ],
    });
  });

  it('returns alreadyRegistered when the person was already registered today', async () => {
    const persona = {
      id: 'persona-2',
      documento: '2020',
      nombres: 'Luis',
      apellidos: 'Gómez',
      celular: '3001234567',
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      fechaNacimiento: '1990-01-01',
      idRed: 'red-1',
      red: { id: 'red-1', nombre: 'Red 1' },
    } as unknown as Persona;

    personaRepo.findOne.mockResolvedValue(persona);
    registroDominicalRepo.findOneBy.mockResolvedValue({
      id: 'registro-existente',
      esNuevo: false,
    });

    const result = await service.registrarPublico('valid-token', {
      documento: '2020',
    });

    expect(result).toMatchObject({
      alreadyRegistered: true,
      registroId: 'registro-existente',
      missingFields: [],
    });
    expect(registroDominicalRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the document is unknown and no person payload is provided', async () => {
    personaRepo.findOne.mockResolvedValue(null);

    await expect(
      service.registrarPublico('valid-token', {
        documento: '9999',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a new person and links attendance when the document is unknown and person payload is provided', async () => {
    const personaCreada = {
      id: 'persona-3',
      documento: '3030',
      nombres: 'Sara',
      apellidos: 'Ruiz',
      celular: '3001234567',
      departamento: 'Antioquia',
      ciudad: 'Medellín',
      fechaNacimiento: null,
      idRed: null,
      red: null,
    } as unknown as Persona;

    personaRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(personaCreada);
    personaRepo.save.mockResolvedValue({ id: 'persona-3' });
    registroDominicalRepo.findOneBy.mockResolvedValue(null);
    registroDominicalRepo.save.mockResolvedValue({ id: 'registro-3' });

    const result = await service.registrarPublico('valid-token', {
      documento: '3030',
      persona: {
        nombres: 'Sara',
        apellidos: 'Ruiz',
        celular: '3001234567',
        departamento: 'Antioquia',
        ciudad: 'Medellín',
      },
    });

    expect(personaRepo.create).toHaveBeenCalled();
    expect(result).toMatchObject({
      alreadyRegistered: false,
      esNuevo: true,
      registroId: 'registro-3',
      missingFields: ['idRed', 'fechaNacimiento'],
    });
  });

  it('filters Sunday records by network on the server and defaults records to 100', async () => {
    const rows = [{ id: 'registro-1' }] as RegistroAsistenciaDominical[];
    registroQueryBuilder.getManyAndCount.mockResolvedValue([rows, 1]);

    const result = await service.findRegistrosByAsistencia('asistencia-1', {
      fecha: '2026-06-13',
      idRed: 'red-1',
    });

    expect(registroQueryBuilder.leftJoin).toHaveBeenCalledWith(
      'persona.red',
      'red',
    );
    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'red.id = :idRed',
      { idRed: 'red-1' },
    );
    expect(registroQueryBuilder.take).toHaveBeenCalledWith(100);
    expect(result).toMatchObject({
      data: rows,
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  it('combines search, date, new-attendee, and network filters with AND', async () => {
    registroQueryBuilder.getManyAndCount.mockResolvedValue([[], 301]);

    const result = await service.findRegistrosByAsistencia('asistencia-1', {
      search: 'Ana',
      fecha: '2026-06-13',
      soloNuevos: 'true',
      idRed: 'red-2',
      page: '2',
      limit: '300',
    });

    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.esNuevo = true',
    );
    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'red.id = :idRed',
      { idRed: 'red-2' },
    );
    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.fechaRegistro = :fecha',
      { fecha: '2026-06-13' },
    );
    expect(registroQueryBuilder.skip).toHaveBeenCalledWith(300);
    expect(registroQueryBuilder.take).toHaveBeenCalledWith(300);
    expect(result).toMatchObject({
      total: 301,
      page: 2,
      limit: 300,
      totalPages: 2,
    });
  });

  it('supports the all page size with a bounded query and coherent metadata', async () => {
    const rows = [
      { id: 'registro-1' },
      { id: 'registro-2' },
    ] as RegistroAsistenciaDominical[];
    registroQueryBuilder.getManyAndCount.mockResolvedValue([rows, 2]);

    const result = await service.findRegistrosByAsistencia('asistencia-1', {
      fecha: '2026-06-13',
      limit: 'all',
    });

    expect(registroQueryBuilder.take).toHaveBeenCalledWith(1000);
    expect(result).toMatchObject({
      data: rows,
      total: 2,
      page: 1,
      limit: 1000,
      totalPages: 1,
    });
  });

  it('scopes monthly summaries to the attendance ID and returns numeric ascending totals', async () => {
    registroQueryBuilder.getRawMany.mockResolvedValue([
      {
        mes: '2026-02',
        totalAsistentes: '8',
        totalNuevos: '3',
      },
      {
        mes: '2026-01',
        totalAsistentes: '12',
        totalNuevos: '4',
      },
    ]);

    const result = await service.findResumenPorMesByAsistencia('asistencia-1');

    expect(registroQueryBuilder.where).toHaveBeenCalledWith(
      'registro.idAsistencia = :asistenciaId',
      { asistenciaId: 'asistencia-1' },
    );
    expect(registroQueryBuilder.groupBy).toHaveBeenCalledWith(
      "TO_CHAR(registro.fechaRegistro, 'YYYY-MM')",
    );
    expect(registroQueryBuilder.orderBy).toHaveBeenCalledWith('mes', 'ASC');
    expect(result).toEqual([
      { mes: '2026-01', totalAsistentes: 12, totalNuevos: 4 },
      { mes: '2026-02', totalAsistentes: 8, totalNuevos: 3 },
    ]);
  });

  it('fills zero-valued months between the first and last recorded month', async () => {
    registroQueryBuilder.getRawMany.mockResolvedValue([
      {
        mes: '2026-01',
        totalAsistentes: '12',
        totalNuevos: '4',
      },
      {
        mes: '2026-03',
        totalAsistentes: '8',
        totalNuevos: '3',
      },
    ]);

    const result = await service.findResumenPorMesByAsistencia('asistencia-1');

    expect(result).toEqual([
      { mes: '2026-01', totalAsistentes: 12, totalNuevos: 4 },
      { mes: '2026-02', totalAsistentes: 0, totalNuevos: 0 },
      { mes: '2026-03', totalAsistentes: 8, totalNuevos: 3 },
    ]);
  });

  it('returns an empty monthly summary when the attendance has no registrations', async () => {
    registroQueryBuilder.getRawMany.mockResolvedValue([]);

    await expect(
      service.findResumenPorMesByAsistencia('asistencia-1'),
    ).resolves.toEqual([]);
  });

  it('rejects monthly summaries for an unknown attendance ID', async () => {
    asistenciaDominicalRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findResumenPorMesByAsistencia('asistencia-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(registroDominicalRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects export requests with an unknown attendance ID', async () => {
    asistenciaDominicalRepo.findOne.mockResolvedValue(null);

    await expect(
      service.exportRegistros('asistencia-missing', '2026-06-13'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects export requests with a malformed date', async () => {
    await expect(
      service.exportRegistros('asistencia-1', 'not-a-date'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns an empty rows array for a valid date with no registrations', async () => {
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      exportQueryBuilder as never,
    );
    exportQueryBuilder.getRawMany.mockResolvedValue([]);

    const result = await service.exportRegistros('asistencia-1', '2026-06-13');

    expect(result).toEqual({ rows: [] });
  });

  it('scopes the export query to the attendance ID and exact normalized date', async () => {
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      exportQueryBuilder as never,
    );
    exportQueryBuilder.getRawMany.mockResolvedValue([]);

    await service.exportRegistros('asistencia-1', '2026-06-13');

    expect(exportQueryBuilder.where).toHaveBeenCalledWith(
      'registro.idAsistencia = :asistenciaId',
      { asistenciaId: 'asistencia-1' },
    );
    expect(exportQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.fechaRegistro = :fecha',
      { fecha: '2026-06-13' },
    );
  });

  it('keeps the Bogotá calendar date deterministic near UTC midnight', async () => {
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      exportQueryBuilder as never,
    );
    exportQueryBuilder.getRawMany.mockResolvedValue([]);

    await service.exportRegistros(
      'asistencia-1',
      new Date('2026-06-13T05:00:00.000Z') as unknown as string,
    );

    expect(exportQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.fechaRegistro = :fecha',
      { fecha: '2026-06-13' },
    );
  });

  it('returns only the 24 allowed flat fields and excludes forbidden columns', async () => {
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      exportQueryBuilder as never,
    );
    exportQueryBuilder.getRawMany.mockResolvedValue([
      {
        idRegistro: 'registro-1',
        fechaRegistro: '2026-06-13',
        esNuevo: true,
        asistenciaId: 'asistencia-1',
        asistenciaNombre: 'Domingo Norte',
        sedeNombre: 'Sede Norte',
        diaRegistro: 'DOMINGO',
        estado: 'ACTIVO',
        redId: 'red-1',
        redNombre: 'Red Norte',
        personaId: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        tipoDocumento: 'CC',
        documento: '101010',
        celular: '3001234567',
        edad: 31,
        genero: 'FEMENINO',
        direccion: 'Calle 123',
        correo: 'ana@example.com',
        barrio: 'Centro',
        departamento: 'Cundinamarca',
        ciudad: 'Bogotá',
        fechaNacimiento: '1990-01-01',
      },
    ]);

    const result = await service.exportRegistros('asistencia-1', '2026-06-13');

    expect(result.rows).toHaveLength(1);
    expect(Object.keys(result.rows[0])).toHaveLength(24);
    expect(result.rows[0]).toMatchObject({
      idRegistro: 'registro-1',
      asistenciaNombre: 'Domingo Norte',
      personaId: 'persona-1',
      documento: '101010',
      genero: 'FEMENINO',
    });

    const selectedColumns = [
      ...(exportQueryBuilder.select.mock.calls as string[][]),
      ...(exportQueryBuilder.addSelect.mock.calls as string[][]),
    ].map(([column]) => column);
    expect(selectedColumns).not.toContain('asistencia.qrToken');
    expect(selectedColumns).not.toContain('persona.password');
    expect(selectedColumns).not.toContain('persona.roles');
    expect(selectedColumns).not.toContain('persona.rol');
    expect(selectedColumns).toContain('asistencia.id');
    expect(selectedColumns).toContain('persona.documento');
    expect(selectedColumns).toContain('red.nombre');
  });

  it('exports every stored registration for the selected attendance when fecha is omitted', async () => {
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      exportQueryBuilder as never,
    );
    exportQueryBuilder.getRawMany.mockResolvedValue([
      {
        idRegistro: 'registro-1',
        fechaRegistro: '2026-04-10',
        esNuevo: false,
        asistenciaId: 'asistencia-1',
        asistenciaNombre: 'Domingo Norte',
        sedeNombre: 'Sede Norte',
        diaRegistro: 'DOMINGO',
        estado: 'ACTIVO',
        redId: null,
        redNombre: null,
        personaId: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        tipoDocumento: 'CC',
        documento: '101010',
        celular: '3001234567',
        edad: 31,
        genero: 'FEMENINO',
        direccion: null,
        correo: null,
        barrio: null,
        departamento: null,
        ciudad: null,
        fechaNacimiento: null,
      },
      {
        idRegistro: 'registro-2',
        fechaRegistro: '2026-06-13',
        esNuevo: true,
        asistenciaId: 'asistencia-1',
        asistenciaNombre: 'Domingo Norte',
        sedeNombre: 'Sede Norte',
        diaRegistro: 'DOMINGO',
        estado: 'ACTIVO',
        redId: null,
        redNombre: null,
        personaId: 'persona-2',
        nombres: 'Luis',
        apellidos: 'Gómez',
        tipoDocumento: 'CC',
        documento: '202020',
        celular: '3001234568',
        edad: 28,
        genero: 'MASCULINO',
        direccion: null,
        correo: null,
        barrio: null,
        departamento: null,
        ciudad: null,
        fechaNacimiento: null,
      },
    ]);

    const result = await service.exportRegistros('asistencia-1');

    expect(exportQueryBuilder.where).toHaveBeenCalledWith(
      'registro.idAsistencia = :asistenciaId',
      { asistenciaId: 'asistencia-1' },
    );
    expect(exportQueryBuilder.andWhere).not.toHaveBeenCalledWith(
      'registro.fechaRegistro = :fecha',
      expect.anything(),
    );
    expect(exportQueryBuilder.orderBy).toHaveBeenCalledWith(
      'registro.fechaRegistro',
      'ASC',
    );
    expect(exportQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'persona.apellidos',
      'ASC',
    );
    expect(exportQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'persona.nombres',
      'ASC',
    );
    expect(exportQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'registro.id',
      'ASC',
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].fechaRegistro).toBe('2026-04-10');
    expect(result.rows[1].fechaRegistro).toBe('2026-06-13');
  });

  it('applies no pagination or row limit to the export query', async () => {
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      exportQueryBuilder as never,
    );
    exportQueryBuilder.getRawMany.mockResolvedValue([]);

    await service.exportRegistros('asistencia-1');

    expect(exportQueryBuilder.take).not.toHaveBeenCalled();
    expect(exportQueryBuilder.skip).not.toHaveBeenCalled();
  });

  it('returns headers-only data for a valid attendance without registrations', async () => {
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      exportQueryBuilder as never,
    );
    exportQueryBuilder.getRawMany.mockResolvedValue([]);

    const result = await service.exportRegistros('asistencia-1');

    expect(result).toEqual({ rows: [] });
  });
});
