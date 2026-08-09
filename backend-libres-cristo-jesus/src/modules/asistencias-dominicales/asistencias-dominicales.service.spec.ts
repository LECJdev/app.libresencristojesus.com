import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';
import { Persona } from '../personas/persona.entity';
import { Red } from '../redes/red.entity';
import { Sede } from '../sedes/sede.entity';
import { CasaDePaz } from '../casas-de-paz/casa-de-paz.entity';
import { AsistenciaCasaPazQr } from '../asistencias-casa-paz/asistencia-casa-paz-qr.entity';
import { AsistenciaDominical } from './asistencia-dominical.entity';
import { AsistenciasDominicalesService } from './asistencias-dominicales.service';
import { RegistroAsistenciaDominical } from './registro-asistencia-dominical.entity';

describe('AsistenciasDominicalesService', () => {
  let service: AsistenciasDominicalesService;

  const reportLinkQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };
  const asistenciaDominicalRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => reportLinkQueryBuilder),
  };
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
    getRawOne: jest.fn(),
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
    createQueryBuilder: jest.fn(),
  };
  const personaReportQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };
  const legacyCasaQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const qrCasaQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const casaDePazRepo = {
    createQueryBuilder: jest.fn(() => legacyCasaQueryBuilder),
  };
  const asistenciaCasaPazQrRepo = {
    createQueryBuilder: jest.fn(() => qrCasaQueryBuilder),
  };

  const asistencia = {
    id: 'asistencia-1',
    estado: EstadoAsistenciaDominical.ACTIVO,
    diaRegistro: DiaPredica.DOMINGO,
  } as AsistenciaDominical;

  beforeEach(async () => {
    jest.clearAllMocks();
    asistenciaDominicalRepo.findOne.mockResolvedValue(asistencia);
    asistenciaDominicalRepo.createQueryBuilder.mockReturnValue(
      reportLinkQueryBuilder,
    );
    reportLinkQueryBuilder.getRawMany.mockResolvedValue([]);
    reportLinkQueryBuilder.getRawOne.mockResolvedValue({
      id: 'asistencia-1',
      nombre: 'Domingo Norte',
      estado: EstadoAsistenciaDominical.ACTIVO,
      diaRegistro: DiaPredica.DOMINGO,
      sedeId: 'sede-1',
      sedeNombre: 'Sede Norte',
    });
    registroDominicalRepo.createQueryBuilder.mockReturnValue(
      registroQueryBuilder,
    );
    registroQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    registroQueryBuilder.getRawMany.mockResolvedValue([]);
    registroQueryBuilder.getRawOne.mockResolvedValue({ id: 'registro-1' });
    personaRepo.createQueryBuilder.mockReturnValue(personaReportQueryBuilder);
    personaReportQueryBuilder.getRawOne.mockResolvedValue(null);
    casaDePazRepo.createQueryBuilder.mockReturnValue(legacyCasaQueryBuilder);
    legacyCasaQueryBuilder.getRawMany.mockResolvedValue([]);
    asistenciaCasaPazQrRepo.createQueryBuilder.mockReturnValue(
      qrCasaQueryBuilder,
    );
    qrCasaQueryBuilder.getRawMany.mockResolvedValue([]);

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
        { provide: getRepositoryToken(CasaDePaz), useValue: casaDePazRepo },
        {
          provide: getRepositoryToken(AsistenciaCasaPazQr),
          useValue: asistenciaCasaPazQrRepo,
        },
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

  it('filters report dates, groups the unassigned Red bucket, and builds a deduplicated matrix', async () => {
    registroQueryBuilder.getRawMany.mockResolvedValue([
      {
        fecha: '2026-01-04',
        esNuevo: true,
        personaId: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        redId: null,
        redNombre: null,
      },
      {
        fecha: '2026-01-11',
        esNuevo: false,
        personaId: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        redId: 'red-1',
        redNombre: 'Red Norte',
      },
      {
        fecha: '2026-01-11',
        esNuevo: true,
        personaId: 'persona-2',
        nombres: 'Luis',
        apellidos: 'Gómez',
        redId: 'red-1',
        redNombre: 'Red Norte',
      },
    ]);

    const result = await service.findReport('asistencia-1', {
      monthFrom: '2026-01',
      monthTo: '2026-01',
    });

    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.fechaRegistro >= :monthFromStart',
      { monthFromStart: '2026-01-01' },
    );
    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.fechaRegistro < :monthToEnd',
      { monthToEnd: '2026-02-01' },
    );
    expect(result.attendanceByDate).toEqual([
      { fecha: '2026-01-04', totalAsistentes: 1, totalNuevos: 1 },
      { fecha: '2026-01-11', totalAsistentes: 2, totalNuevos: 1 },
    ]);
    expect(result.attendanceByRed).toEqual([
      { idRed: 'red-1', nombreRed: 'Red Norte', totalAsistentes: 2 },
      { idRed: null, nombreRed: null, totalAsistentes: 1 },
    ]);
    expect(result.people).toEqual([
      {
        id: 'persona-2',
        nombres: 'Luis',
        apellidos: 'Gómez',
        attendanceByDate: { '2026-01-11': true },
      },
      {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        attendanceByDate: { '2026-01-04': true, '2026-01-11': true },
      },
    ]);
  });

  it('returns safe report link metadata without QR credentials', async () => {
    reportLinkQueryBuilder.getRawMany.mockResolvedValue([
      {
        id: 'asistencia-1',
        nombre: 'Domingo Norte',
        estado: EstadoAsistenciaDominical.ACTIVO,
        diaRegistro: DiaPredica.DOMINGO,
        sedeId: 'sede-1',
        sedeNombre: 'Sede Norte',
      },
    ]);

    const result = await service.findReportLinks();

    expect(result).toEqual([
      {
        id: 'asistencia-1',
        nombre: 'Domingo Norte',
        estado: EstadoAsistenciaDominical.ACTIVO,
        diaRegistro: DiaPredica.DOMINGO,
        sede: { id: 'sede-1', nombre: 'Sede Norte' },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('qrToken');
  });

  it('requires registration in the selected Dominical before loading person details', async () => {
    registroQueryBuilder.getRawOne.mockResolvedValue(null);

    await expect(
      service.findReportPerson('asistencia-1', 'persona-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(personaRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns the safe profile allowlist and both Casa de Paz responsibility sources', async () => {
    registroQueryBuilder.getRawOne.mockResolvedValue({ id: 'registro-1' });
    personaReportQueryBuilder.getRawOne.mockResolvedValue({
      id: 'persona-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      edad: '31',
      celular: '3001234567',
      tipoDocumento: 'CC',
      documento: '1010',
      genero: 'FEMENINO',
      direccion: 'Calle 1',
      correo: 'ana@example.com',
      encuentro: true,
      rol: 'INTEGRANTE',
      roles: ['INTEGRANTE', 'LIDER_CASA_DE_PAZ'],
      barrio: 'Centro',
      departamento: 'Cundinamarca',
      ciudad: 'Bogotá',
      fechaNacimiento: '1995-01-02',
      idRed: 'red-1',
      redId: 'red-1',
      redNombre: 'Red Norte',
      redDetalles: 'Detalle',
      redIdSede: 'sede-1',
      sedeId: 'sede-1',
      sedeNombre: 'Sede Norte',
      sedeDireccion: 'Carrera 1',
      invitadoPorId: 'persona-2',
      invitadoPorNombres: 'Luis',
      invitadoPorApellidos: 'Gómez',
      fechaCreacion: '2026-01-01T00:00:00.000Z',
      fechaModificacion: '2026-01-03T00:00:00.000Z',
    });
    legacyCasaQueryBuilder.getRawMany.mockResolvedValue([
      {
        id: 'casa-legacy',
        direccion: 'Calle 10',
        detalle: 'Casa histórica',
        activa: true,
        diaDePredica: DiaPredica.DOMINGO,
        idDistrito: 'distrito-1',
      },
    ]);
    qrCasaQueryBuilder.getRawMany.mockResolvedValue([
      {
        id: 'casa-qr',
        nombre: 'Casa Norte',
        estado: 'ACTIVO',
        diaRegistro: DiaPredica.DOMINGO,
        direccionCasa: 'Carrera 2',
        idRed: 'red-1',
        redNombre: 'Red Norte',
        idPersonaACargo: 'persona-1',
        idAnfitrion: null,
        idLiderPrincipal: 'persona-1',
      },
    ]);

    const result = await service.findReportPerson('asistencia-1', 'persona-1');
    const serialized = JSON.stringify(result);

    expect(result.persona.red?.sede).toEqual({
      id: 'sede-1',
      nombre: 'Sede Norte',
      direccion: 'Carrera 1',
    });
    expect(result.persona.roles).toEqual(['LIDER_CASA_DE_PAZ', 'INTEGRANTE']);
    expect(result.casaDePaz.legacy).toHaveLength(1);
    expect(result.casaDePaz.qr[0]?.roles).toEqual([
      'personaACargo',
      'liderPrincipal',
    ]);
    const selectedProfileFields = [
      ...(personaReportQueryBuilder.select.mock.calls as unknown[][]),
      ...(personaReportQueryBuilder.addSelect.mock.calls as unknown[][]),
    ]
      .flat()
      .map(String)
      .join(' ');
    expect(selectedProfileFields).not.toMatch(/password|qrToken/);
    expect(result).not.toHaveProperty('password');
    expect(serialized).not.toContain('qrToken');
    expect(serialized).not.toContain('password');
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
