import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaCasaPaz } from '../../common/enums/estado-asistencia-casa-paz.enum';
import { Rol } from '../../common/enums/rol.enum';
import { Persona } from '../personas/persona.entity';
import { Red } from '../redes/red.entity';
import { Sede } from '../sedes/sede.entity';
import { AsistenciaCasaPazQr } from './asistencia-casa-paz-qr.entity';
import { AsistenciasCasaPazService } from './asistencias-casa-paz.service';
import { CasaPazSesion } from './casa-paz-sesion.entity';
import { RegistroAsistenciaCasaPazQr } from './registro-asistencia-casa-paz-qr.entity';

describe('AsistenciasCasaPazService', () => {
  let service: AsistenciasCasaPazService;

  const leaderUser = {
    id: 'persona-leader',
    rol: Rol.LIDER_CASA_DE_PAZ,
    roles: [Rol.LIDER_CASA_DE_PAZ],
  };

  const adminUser = {
    id: 'persona-admin',
    rol: Rol.ADMIN,
    roles: [Rol.ADMIN],
  };

  const asistenciaQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const asistenciaCasaPazRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => asistenciaQueryBuilder),
  };
  const registroQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    select: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
  };
  const registroCasaPazRepo = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => registroQueryBuilder),
  };
  const sesionQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };
  const casaPazSesionRepo = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    merge: jest.fn((entity, value) => ({ ...entity, ...value })),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => sesionQueryBuilder),
  };
  const sedeRepo = { findOneBy: jest.fn() };
  const redRepo = { findOneBy: jest.fn() };
  const personaRepo = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const asistencia = {
    id: 'asistencia-1',
    estado: EstadoAsistenciaCasaPaz.ACTIVO,
    diaRegistro: DiaPredica.DOMINGO,
  } as AsistenciaCasaPazQr;

  const getFirstSavedAsistencia = () => {
    const saveCalls = asistenciaCasaPazRepo.save.mock.calls as Array<
      [Partial<AsistenciaCasaPazQr>]
    >;

    return saveCalls[0][0];
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    Object.values(registroQueryBuilder).forEach((mock) => {
      if ('mockClear' in mock) {
        mock.mockClear();
      }
    });

    Object.values(sesionQueryBuilder).forEach((mock) => {
      if ('mockClear' in mock) {
        mock.mockClear();
      }
    });

    Object.values(asistenciaQueryBuilder).forEach((mock) => {
      if ('mockClear' in mock) {
        mock.mockClear();
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsistenciasCasaPazService,
        {
          provide: getRepositoryToken(AsistenciaCasaPazQr),
          useValue: asistenciaCasaPazRepo,
        },
        {
          provide: getRepositoryToken(RegistroAsistenciaCasaPazQr),
          useValue: registroCasaPazRepo,
        },
        {
          provide: getRepositoryToken(CasaPazSesion),
          useValue: casaPazSesionRepo,
        },
        { provide: getRepositoryToken(Sede), useValue: sedeRepo },
        { provide: getRepositoryToken(Red), useValue: redRepo },
        { provide: getRepositoryToken(Persona), useValue: personaRepo },
      ],
    }).compile();

    service = module.get<AsistenciasCasaPazService>(AsistenciasCasaPazService);
    asistenciaCasaPazRepo.findOne.mockResolvedValue(asistencia);
    redRepo.findOneBy.mockResolvedValue({ id: 'red-1' });
    jest
      .spyOn(service as never, 'getDiaPredicaFromDate')
      .mockReturnValue(DiaPredica.DOMINGO);
    jest
      .spyOn(service as never, 'getCurrentDateString')
      .mockReturnValue('2026-06-23');
  });

  it('throws NotFoundException when the document is unknown and no person payload is provided', async () => {
    personaRepo.findOne.mockResolvedValue(null);

    await expect(
      service.registrarPublico('valid-token', {
        documento: '9999',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a new person from simplified Casa de Paz payload and preserves encuentro', async () => {
    const personaCreada = {
      id: 'persona-3',
      documento: '3030',
      nombres: 'Sara',
      apellidos: null,
      celular: '3001234567',
      fechaNacimiento: null,
      encuentro: true,
      idRed: null,
      red: null,
    } as unknown as Persona;

    personaRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(personaCreada);
    personaRepo.save.mockResolvedValue({ id: 'persona-3' });
    registroCasaPazRepo.findOneBy.mockResolvedValue(null);
    registroCasaPazRepo.save.mockResolvedValue({ id: 'registro-3' });

    const result = await service.registrarPublico('valid-token', {
      documento: '3030',
      persona: {
        nombreCompleto: 'Sara',
        celular: '3001234567',
        encuentro: true,
      },
    });

    expect(personaRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombres: 'Sara',
        apellidos: null,
        celular: '3001234567',
        encuentro: true,
      }),
    );
    expect(result).toMatchObject({
      alreadyRegistered: false,
      esNuevo: true,
      registroId: 'registro-3',
      needsProfileCompletion: false,
    });
  });

  it('scopes leader-owned attendance lookup to the authenticated persona', async () => {
    asistenciaCasaPazRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.findOne('asistencia-2', leaderUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(asistenciaCasaPazRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { id: 'asistencia-2', idPersonaACargo: leaderUser.id },
          { id: 'asistencia-2', idLiderPrincipal: leaderUser.id },
        ],
      }),
    );
  });

  it('forces only the leader assignment to the logged-in scoped leader on create', async () => {
    asistenciaCasaPazRepo.save.mockResolvedValue({ id: 'asistencia-1' });
    personaRepo.findOneBy
      .mockResolvedValueOnce({ id: 'persona-other' })
      .mockResolvedValueOnce({ id: 'persona-host' });

    await service.create(
      {
        nombre: 'Casa de Paz Norte',
        idRed: 'red-1',
        direccionCasa: 'Calle 123',
        diaRegistro: DiaPredica.DOMINGO,
        idPersonaACargo: 'persona-other',
        idAnfitrion: 'persona-host',
        idLiderPrincipal: 'persona-other',
      },
      leaderUser,
    );

    expect(asistenciaCasaPazRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idPersonaACargo: 'persona-other',
        idAnfitrion: 'persona-host',
        idLiderPrincipal: leaderUser.id,
      }),
    );
    expect(personaRepo.findOneBy).toHaveBeenCalledWith({ id: 'persona-other' });
  });

  it('allows optional host and person-in-charge assignments for admin-managed attendance', async () => {
    asistenciaCasaPazRepo.save.mockResolvedValue({ id: 'asistencia-1' });
    personaRepo.findOneBy.mockResolvedValueOnce({ id: 'persona-leader-1' });

    await service.create(
      {
        nombre: 'Casa de Paz Norte',
        idRed: 'red-1',
        direccionCasa: 'Calle 123',
        diaRegistro: DiaPredica.DOMINGO,
        idPersonaACargo: null,
        idAnfitrion: null,
        idLiderPrincipal: 'persona-leader-1',
      },
      adminUser,
    );

    expect(asistenciaCasaPazRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idPersonaACargo: null,
        idAnfitrion: null,
        idLiderPrincipal: 'persona-leader-1',
      }),
    );
  });

  it('requires a Casa de Paz leader for admin-managed attendance creation', async () => {
    await expect(
      service.create(
        {
          nombre: 'Casa de Paz Norte',
          idRed: 'red-1',
          direccionCasa: 'Calle 123',
          diaRegistro: DiaPredica.DOMINGO,
          idPersonaACargo: null,
          idAnfitrion: null,
          idLiderPrincipal: null,
        },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(asistenciaCasaPazRepo.save).not.toHaveBeenCalled();
  });

  it('strips loaded relations before saving admin edits so foreign-key changes persist cleanly', async () => {
    const asistenciaCargada = {
      id: 'asistencia-1',
      nombre: 'Casa de Paz Norte',
      estado: EstadoAsistenciaCasaPaz.ACTIVO,
      diaRegistro: DiaPredica.DOMINGO,
      idRed: 'red-1',
      direccionCasa: 'Calle 123',
      idPersonaACargo: 'persona-old',
      idAnfitrion: 'persona-host-old',
      idLiderPrincipal: 'persona-leader-old',
      red: { id: 'red-1', nombre: 'Red anterior' },
      personaACargo: { id: 'persona-old', nombres: 'Old' },
      anfitrion: { id: 'persona-host-old', nombres: 'Host Old' },
      liderPrincipal: { id: 'persona-leader-old', nombres: 'Leader Old' },
    } as unknown as AsistenciaCasaPazQr;

    const asistenciaActualizada = {
      ...asistenciaCargada,
      idRed: 'red-2',
      idPersonaACargo: 'persona-new',
      idAnfitrion: 'persona-host-new',
      idLiderPrincipal: 'persona-leader-new',
      red: { id: 'red-2', nombre: 'Red nueva' },
      personaACargo: { id: 'persona-new', nombres: 'New' },
      anfitrion: { id: 'persona-host-new', nombres: 'Host New' },
      liderPrincipal: { id: 'persona-leader-new', nombres: 'Leader New' },
    } as unknown as AsistenciaCasaPazQr;

    asistenciaCasaPazRepo.findOne
      .mockResolvedValueOnce(asistenciaCargada)
      .mockResolvedValueOnce(asistenciaActualizada);
    asistenciaCasaPazRepo.save.mockResolvedValue(asistenciaActualizada);
    redRepo.findOneBy.mockResolvedValueOnce({ id: 'red-2' });
    personaRepo.findOneBy
      .mockResolvedValueOnce({ id: 'persona-new' })
      .mockResolvedValueOnce({ id: 'persona-host-new' })
      .mockResolvedValueOnce({ id: 'persona-leader-new' });

    await service.update(
      'asistencia-1',
      {
        idRed: 'red-2',
        idPersonaACargo: 'persona-new',
        idAnfitrion: 'persona-host-new',
        idLiderPrincipal: 'persona-leader-new',
      },
      adminUser,
    );

    const savedArg = getFirstSavedAsistencia();

    expect(savedArg.idRed).toBe('red-2');
    expect(savedArg.idPersonaACargo).toBe('persona-new');
    expect(savedArg.idAnfitrion).toBe('persona-host-new');
    expect(savedArg.idLiderPrincipal).toBe('persona-leader-new');
    expect(savedArg.red).toBeUndefined();
    expect(savedArg.personaACargo).toBeUndefined();
    expect(savedArg.anfitrion).toBeUndefined();
    expect(savedArg.liderPrincipal).toBeUndefined();
  });

  it('requires a Casa de Paz leader when admin updates attendance assignments', async () => {
    const asistenciaSinLider = {
      id: 'asistencia-1',
      nombre: 'Casa de Paz Norte',
      estado: EstadoAsistenciaCasaPaz.ACTIVO,
      diaRegistro: DiaPredica.DOMINGO,
      idRed: 'red-1',
      direccionCasa: 'Calle 123',
      idPersonaACargo: null,
      idAnfitrion: null,
      idLiderPrincipal: 'persona-leader-old',
    } as unknown as AsistenciaCasaPazQr;

    asistenciaCasaPazRepo.findOne.mockResolvedValueOnce(asistenciaSinLider);

    await expect(
      service.update(
        'asistencia-1',
        {
          idPersonaACargo: null,
          idAnfitrion: null,
          idLiderPrincipal: null,
        },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(asistenciaCasaPazRepo.save).not.toHaveBeenCalled();
  });

  it('keeps the scoped leader locked while allowing person-in-charge updates', async () => {
    const scopedAttendance = {
      id: 'asistencia-1',
      nombre: 'Casa de Paz Norte',
      estado: EstadoAsistenciaCasaPaz.ACTIVO,
      diaRegistro: DiaPredica.DOMINGO,
      idRed: 'red-1',
      direccionCasa: 'Calle 123',
      idPersonaACargo: null,
      idAnfitrion: null,
      idLiderPrincipal: leaderUser.id,
    } as unknown as AsistenciaCasaPazQr;

    asistenciaCasaPazRepo.findOne
      .mockResolvedValueOnce(scopedAttendance)
      .mockResolvedValueOnce({
        ...scopedAttendance,
        idPersonaACargo: 'persona-support',
      });
    asistenciaCasaPazRepo.save.mockResolvedValue(scopedAttendance);
    personaRepo.findOneBy.mockResolvedValueOnce({ id: 'persona-support' });

    await service.update(
      'asistencia-1',
      {
        idPersonaACargo: 'persona-support',
        idLiderPrincipal: 'persona-other',
      },
      leaderUser,
    );

    const savedArg = getFirstSavedAsistencia();

    expect(savedArg.idPersonaACargo).toBe('persona-support');
    expect(savedArg.idLiderPrincipal).toBe(leaderUser.id);
  });

  it('preserves the existing main leader when a scoped user edits through person-in-charge access', async () => {
    const scopedAttendance = {
      id: 'asistencia-1',
      nombre: 'Casa de Paz Norte',
      estado: EstadoAsistenciaCasaPaz.ACTIVO,
      diaRegistro: DiaPredica.DOMINGO,
      idRed: 'red-1',
      direccionCasa: 'Calle 123',
      idPersonaACargo: leaderUser.id,
      idAnfitrion: null,
      idLiderPrincipal: 'persona-leader-owner',
    } as unknown as AsistenciaCasaPazQr;

    asistenciaCasaPazRepo.findOne
      .mockResolvedValueOnce(scopedAttendance)
      .mockResolvedValueOnce({
        ...scopedAttendance,
        idPersonaACargo: 'persona-support',
      });
    asistenciaCasaPazRepo.save.mockResolvedValue(scopedAttendance);
    personaRepo.findOneBy.mockResolvedValueOnce({ id: 'persona-support' });

    await service.update(
      'asistencia-1',
      {
        idPersonaACargo: 'persona-support',
        idLiderPrincipal: leaderUser.id,
      },
      leaderUser,
    );

    const savedArg = getFirstSavedAsistencia();

    expect(savedArg.idPersonaACargo).toBe('persona-support');
    expect(savedArg.idLiderPrincipal).toBe('persona-leader-owner');
  });

  it('does not resolve leader payloads for scoped person-in-charge edits', async () => {
    const scopedAttendance = {
      id: 'asistencia-1',
      nombre: 'Casa de Paz Norte',
      estado: EstadoAsistenciaCasaPaz.ACTIVO,
      diaRegistro: DiaPredica.DOMINGO,
      idRed: 'red-1',
      direccionCasa: 'Calle 123',
      idPersonaACargo: leaderUser.id,
      idAnfitrion: null,
      idLiderPrincipal: 'persona-leader-owner',
    } as unknown as AsistenciaCasaPazQr;

    asistenciaCasaPazRepo.findOne
      .mockResolvedValueOnce(scopedAttendance)
      .mockResolvedValueOnce(scopedAttendance);
    asistenciaCasaPazRepo.save.mockResolvedValue(scopedAttendance);

    await service.update(
      'asistencia-1',
      {
        nombre: 'Casa de Paz Norte Actualizada',
        idLiderPrincipal: 'persona-other',
      },
      leaderUser,
    );

    const savedArg = getFirstSavedAsistencia();

    expect(personaRepo.findOneBy).not.toHaveBeenCalled();
    expect(savedArg.nombre).toBe('Casa de Paz Norte Actualizada');
    expect(savedArg.idLiderPrincipal).toBe('persona-leader-owner');
  });

  it('exports one safe row per scoped attendance record with a month filter', async () => {
    asistenciaQueryBuilder.getRawMany.mockResolvedValueOnce([
      {
        id: 'asistencia-1',
        nombre: 'Casa de Paz Norte',
        estado: EstadoAsistenciaCasaPaz.ACTIVO,
        diaRegistro: DiaPredica.DOMINGO,
        direccionCasa: 'Calle 123',
        redName: 'Red Norte',
      },
    ]);
    registroQueryBuilder.getRawMany.mockResolvedValueOnce([
      {
        idRegistro: 'registro-1',
        fechaRegistro: '2026-06-23',
        esNuevo: true,
        idAsistencia: 'asistencia-1',
        nombreAsistencia: 'Casa de Paz Norte',
        estadoAsistencia: EstadoAsistenciaCasaPaz.ACTIVO,
        diaRegistro: DiaPredica.DOMINGO,
        direccionCasa: 'Calle 123',
        idRedAsistencia: 'red-1',
        nombreRedAsistencia: 'Red Norte',
        idPersona: 'persona-1',
        nombresPersona: 'Ana',
        apellidosPersona: 'Perez',
        tipoDocumentoPersona: null,
        documentoPersona: '123',
        celularPersona: '3001234567',
        edadPersona: '31',
        generoPersona: null,
        direccionPersona: 'Carrera 1',
        correoPersona: 'ana@example.com',
        barrioPersona: 'Centro',
        departamentoPersona: 'Cundinamarca',
        ciudadPersona: 'Bogota',
        fechaNacimientoPersona: '1995-01-02',
        encuentroPersona: 'false',
        idRedPersona: 'red-2',
        nombreRedPersona: 'Red Sur',
      },
    ]);

    const report = await service.findExportRowsReport(
      { month: '2026-06' },
      leaderUser,
    );

    expect(report).toMatchObject({
      scope: 'scoped',
      filters: {
        month: '2026-06',
        fecha: null,
        asistenciaId: null,
      },
    });
    expect(report.rows).toEqual([
      {
        idRegistro: 'registro-1',
        fechaRegistro: '2026-06-23',
        esNuevo: true,
        asistencia: {
          id: 'asistencia-1',
          nombre: 'Casa de Paz Norte',
          estado: EstadoAsistenciaCasaPaz.ACTIVO,
          diaRegistro: DiaPredica.DOMINGO,
          direccionCasa: 'Calle 123',
          red: { id: 'red-1', nombre: 'Red Norte' },
        },
        persona: {
          id: 'persona-1',
          nombres: 'Ana',
          apellidos: 'Perez',
          tipoDocumento: null,
          documento: '123',
          celular: '3001234567',
          edad: 31,
          genero: null,
          direccion: 'Carrera 1',
          correo: 'ana@example.com',
          barrio: 'Centro',
          departamento: 'Cundinamarca',
          ciudad: 'Bogota',
          fechaNacimiento: '1995-01-02',
          encuentro: false,
          red: { id: 'red-2', nombre: 'Red Sur' },
        },
      },
    ]);
    expect(report.rows[0].persona).not.toHaveProperty('password');
    expect(report.rows[0].asistencia).not.toHaveProperty('qrToken');

    expect(asistenciaQueryBuilder.andWhere).toHaveBeenCalledWith(
      '(asistencia.idPersonaACargo = :currentUserId OR asistencia.idLiderPrincipal = :currentUserId)',
      { currentUserId: leaderUser.id },
    );
    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.fechaRegistro >= :startDate AND registro.fechaRegistro < :endDate',
      { startDate: '2026-06-01', endDate: '2026-07-01' },
    );
    expect(registroQueryBuilder.select).toHaveBeenCalledWith(
      'registro.id',
      'idRegistro',
    );
    expect(registroQueryBuilder.addSelect).toHaveBeenCalledWith(
      'registro.esNuevo',
      'esNuevo',
    );
  });

  it('requires a date or month before starting an attendance export', async () => {
    await expect(
      service.findExportRowsReport({}, adminUser),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(asistenciaCasaPazRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(registroCasaPazRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('applies the daily report date filter to export rows', async () => {
    asistenciaQueryBuilder.getRawMany.mockResolvedValueOnce([
      {
        id: 'asistencia-1',
        nombre: 'Casa de Paz Norte',
        estado: EstadoAsistenciaCasaPaz.ACTIVO,
        diaRegistro: DiaPredica.DOMINGO,
        direccionCasa: 'Calle 123',
        redName: 'Red Norte',
      },
    ]);
    registroQueryBuilder.getRawMany.mockResolvedValueOnce([]);

    const report = await service.findExportRowsReport(
      { fecha: '2026-06-23' },
      adminUser,
    );

    expect(report.filters).toMatchObject({
      month: null,
      fecha: '2026-06-23',
    });
    expect(registroQueryBuilder.andWhere).toHaveBeenCalledWith(
      'registro.fechaRegistro = :fecha',
      { fecha: '2026-06-23' },
    );
  });

  it('blocks detail exports outside a scoped leader ownership boundary', async () => {
    asistenciaQueryBuilder.getRawMany.mockResolvedValueOnce([]);
    asistenciaCasaPazRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.findDetailExportRowsReport(
        'asistencia-other',
        { fecha: '2026-06-23' },
        leaderUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(registroCasaPazRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('blocks leader access to nested attendance records outside their scope', async () => {
    asistenciaCasaPazRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.findRegistrosByAsistencia('asistencia-other', {}, leaderUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(registroCasaPazRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('blocks leader session updates outside their scope before touching nested session data', async () => {
    asistenciaCasaPazRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.upsertSesionByAsistencia(
        'asistencia-other',
        { fecha: '2026-06-23', montoOfrenda: 25 },
        leaderUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(casaPazSesionRepo.findOneBy).not.toHaveBeenCalled();
    expect(casaPazSesionRepo.save).not.toHaveBeenCalled();
  });

  it('returns attendance dates for leader-owned detail flows from registros and sessions', async () => {
    registroQueryBuilder.getRawMany.mockResolvedValueOnce([
      { fechaRegistro: '2026-06-22' },
      { fechaRegistro: '2026-06-21' },
    ]);
    sesionQueryBuilder.getRawMany.mockResolvedValueOnce([
      { fecha: '2026-06-23' },
      { fecha: '2026-06-22' },
    ]);

    await expect(
      service.findFechasDisponiblesByAsistencia('asistencia-1', leaderUser),
    ).resolves.toEqual(['2026-06-23', '2026-06-22', '2026-06-21']);

    expect(registroQueryBuilder.where).toHaveBeenCalledWith(
      'registro.idAsistencia = :asistenciaId',
      { asistenciaId: 'asistencia-1' },
    );
    expect(sesionQueryBuilder.where).toHaveBeenCalledWith(
      'sesion.idAsistenciaCasaPazQr = :asistenciaId',
      { asistenciaId: 'asistencia-1' },
    );
  });

  it('stores and returns session offering amounts', async () => {
    casaPazSesionRepo.findOneBy.mockResolvedValueOnce(null);
    casaPazSesionRepo.save.mockResolvedValueOnce({
      fecha: '2026-06-23',
      montoOfrenda: 25,
    });

    await expect(
      service.upsertSesionByAsistencia(
        'asistencia-1',
        { fecha: '2026-06-23', montoOfrenda: 25 },
        leaderUser,
      ),
    ).resolves.toEqual({
      fecha: '2026-06-23',
      montoOfrenda: 25,
      exists: true,
    });

    expect(casaPazSesionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idAsistenciaCasaPazQr: 'asistencia-1',
        fecha: '2026-06-23',
        montoOfrenda: 25,
      }),
    );
  });

  it('stores the public offering for the current date', async () => {
    casaPazSesionRepo.findOneBy.mockResolvedValueOnce(null);
    casaPazSesionRepo.save.mockResolvedValueOnce({
      fecha: '2026-06-23',
      montoOfrenda: 40,
    });

    await expect(
      service.upsertPublicOffering('valid-token', { montoOfrenda: 40 }),
    ).resolves.toEqual({
      fecha: '2026-06-23',
      montoOfrenda: 40,
      exists: true,
    });

    expect(casaPazSesionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        idAsistenciaCasaPazQr: 'asistencia-1',
        fecha: '2026-06-23',
        montoOfrenda: 40,
      }),
    );
  });

  it('normalizes mixed report date values before sorting and formatting report responses', async () => {
    asistenciaQueryBuilder.getRawMany.mockResolvedValueOnce([
      {
        id: 'asistencia-1',
        nombre: 'Casa de Paz Norte',
        estado: EstadoAsistenciaCasaPaz.ACTIVO,
        diaRegistro: DiaPredica.DOMINGO,
        direccionCasa: 'Calle 123',
        redName: 'Red Norte',
      },
    ]);

    registroQueryBuilder.getRawOne.mockResolvedValueOnce({
      attendanceTotal: '3',
      uniquePeopleReached: '2',
      newPeopleTotal: '1',
    });
    registroQueryBuilder.getRawMany
      .mockResolvedValueOnce([
        {
          id: 'asistencia-1',
          nombre: 'Casa de Paz Norte',
          estado: EstadoAsistenciaCasaPaz.ACTIVO,
          diaRegistro: DiaPredica.DOMINGO,
          direccionCasa: 'Calle 123',
          redName: 'Red Norte',
          attendanceTotal: '3',
          uniquePeopleReached: '2',
          newPeopleTotal: '1',
          lastAttendanceDate: new Date('2026-06-23T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          idRed: 'red-1',
          nombreRed: 'Red Norte',
          attendanceTotal: '3',
          uniquePeopleReached: '2',
        },
      ])
      .mockResolvedValueOnce([
        {
          fecha: new Date('2026-06-23T00:00:00.000Z'),
          attendanceTotal: '2',
          uniquePeopleReached: '2',
          newPeopleTotal: '1',
        },
        {
          fecha: '2026-06-22T00:00:00.000Z',
          attendanceTotal: '1',
          uniquePeopleReached: '1',
          newPeopleTotal: '0',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'persona-1',
          nombres: 'Ana',
          apellidos: 'Perez',
          documento: '123',
          celular: '3001234567',
          encuentro: false,
          redName: 'Red Norte',
          attendanceCount: '2',
          firstAttendanceDate: new Date('2026-06-22T00:00:00.000Z'),
          lastAttendanceDate: '2026-06-23T00:00:00.000Z',
          linksCount: '1',
        },
      ]);

    sesionQueryBuilder.getRawOne.mockResolvedValueOnce({
      sessionCount: '2',
      offeringTotal: '55',
    });
    sesionQueryBuilder.getRawMany
      .mockResolvedValueOnce([
        {
          id: 'asistencia-1',
          sessionCount: '2',
          offeringTotal: '55',
        },
      ])
      .mockResolvedValueOnce([
        {
          fecha: '2026-06-24',
          sessionCount: '1',
          offeringTotal: '30',
        },
        {
          fecha: new Date('2026-06-23T00:00:00.000Z'),
          sessionCount: '1',
          offeringTotal: '25',
        },
      ]);

    const report = await service.findGeneralReport(adminUser);

    expect(report.attendanceByDate.map((item) => item.fecha)).toEqual([
      '2026-06-24',
      '2026-06-23',
      '2026-06-22',
    ]);
    expect(report.attendanceByDate[1]).toMatchObject({
      fecha: '2026-06-23',
      dayLabel: 'Tue, Jun 23',
      attendanceTotal: 2,
      sessionCount: 1,
      offeringTotal: 25,
    });
    expect(report.attendanceByLink[0].lastAttendanceDate).toBe('2026-06-23');
    expect(report.encounterCandidates[0]).toMatchObject({
      firstAttendanceDate: '2026-06-22',
      lastAttendanceDate: '2026-06-23',
    });
  });
});
