import { Repository } from 'typeorm';
import { Persona } from './persona.entity';
import { PersonasService } from './personas.service';
import { Red } from '../redes/red.entity';

describe('PersonasService export rows', () => {
  const queryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };
  const personaRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  } as unknown as Repository<Persona>;

  const service = new PersonasService(personaRepository, {} as Repository<Red>);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a safe list projection with roles and required display fields', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        edad: 31,
        celular: '3001234567',
        tipoDocumento: 'C.C',
        documento: '123',
        genero: 'FEMENINO',
        direccion: 'Calle 1',
        correo: 'ana@example.com',
        encuentro: true,
        rol: 'ADMIN',
        roles: ['ADMIN'],
        barrio: 'Centro',
        departamento: 'Cundinamarca',
        ciudad: 'Bogotá',
        fechaNacimiento: '1995-01-01',
        idRed: 'red-1',
        redId: 'red-1',
        redNombre: 'Red Norte',
        redDetalles: 'Detalles públicos',
        redIdSede: 'sede-1',
        sedeId: 'sede-1',
        sedeNombre: 'Sede Norte',
        sedeDireccion: 'Calle 2',
        invitadoPorId: 'persona-2',
        invitadoPorNombres: 'Luis',
        invitadoPorApellidos: 'Gómez',
        fechaCreacion: '2026-07-01T00:00:00.000Z',
        fechaModificacion: '2026-07-02T00:00:00.000Z',
        password: 'secret',
        accessToken: 'token',
        qrSecret: 'qr-secret',
        resetToken: 'reset-token',
      },
    ]);

    const rows = await service.findAll();

    expect(rows).toEqual([
      {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        edad: 31,
        celular: '3001234567',
        tipoDocumento: 'C.C',
        documento: '123',
        genero: 'FEMENINO',
        direccion: 'Calle 1',
        correo: 'ana@example.com',
        encuentro: true,
        rol: 'ADMIN',
        roles: ['ADMIN'],
        barrio: 'Centro',
        departamento: 'Cundinamarca',
        ciudad: 'Bogotá',
        fechaNacimiento: '1995-01-01',
        idRed: 'red-1',
        red: {
          id: 'red-1',
          nombre: 'Red Norte',
          detalles: 'Detalles públicos',
          idSede: 'sede-1',
          sede: {
            id: 'sede-1',
            nombre: 'Sede Norte',
            direccion: 'Calle 2',
          },
        },
        invitadoPor: {
          id: 'persona-2',
          nombres: 'Luis',
          apellidos: 'Gómez',
        },
        fechaCreacion: '2026-07-01T00:00:00.000Z',
        fechaModificacion: '2026-07-02T00:00:00.000Z',
      },
    ]);

    expect(rows[0]).not.toHaveProperty('password');
    expect(rows[0]).not.toHaveProperty('accessToken');
    expect(rows[0]).not.toHaveProperty('qrSecret');
    expect(rows[0]).not.toHaveProperty('resetToken');
    expect(rows[0].invitadoPor).not.toHaveProperty('password');

    const selectedAliases = [
      'id',
      ...queryBuilder.addSelect.mock.calls.map(
        (call: [string, string]) => call[1],
      ),
    ];
    expect(selectedAliases).not.toEqual(
      expect.arrayContaining([
        'password',
        'accessToken',
        'qrSecret',
        'resetToken',
      ]),
    );
    expect(selectedAliases).toEqual([
      'id',
      'nombres',
      'apellidos',
      'edad',
      'celular',
      'tipoDocumento',
      'documento',
      'genero',
      'direccion',
      'correo',
      'encuentro',
      'rol',
      'roles',
      'barrio',
      'departamento',
      'ciudad',
      'fechaNacimiento',
      'idRed',
      'redId',
      'redNombre',
      'redDetalles',
      'redIdSede',
      'sedeId',
      'sedeNombre',
      'sedeDireccion',
      'invitadoPorId',
      'invitadoPorNombres',
      'invitadoPorApellidos',
      'fechaCreacion',
      'fechaModificacion',
    ]);
  });

  it('returns the same safe projection for a single-person read', async () => {
    queryBuilder.getRawOne.mockResolvedValue({
      id: 'persona-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      edad: 31,
      celular: '3001234567',
      tipoDocumento: 'C.C',
      documento: '123',
      genero: 'FEMENINO',
      direccion: 'Calle 1',
      correo: 'ana@example.com',
      encuentro: true,
      rol: 'ADMIN',
      roles: ['ADMIN'],
      barrio: 'Centro',
      departamento: 'Cundinamarca',
      ciudad: 'Bogotá',
      fechaNacimiento: '1995-01-01',
      idRed: null,
      redId: null,
      redNombre: null,
      redDetalles: null,
      redIdSede: null,
      sedeId: null,
      sedeNombre: null,
      sedeDireccion: null,
      invitadoPorId: 'persona-2',
      invitadoPorNombres: 'Luis',
      invitadoPorApellidos: 'Gómez',
      fechaCreacion: null,
      fechaModificacion: null,
      password: 'secret',
      invitadoPor: { password: 'nested-secret' },
    });

    const row = await service.findOneForRead('persona-1');

    expect(queryBuilder.where).toHaveBeenCalledWith('persona.id = :id', {
      id: 'persona-1',
    });
    expect(row).toMatchObject({
      id: 'persona-1',
      nombres: 'Ana',
      apellidos: 'Pérez',
      rol: 'ADMIN',
      roles: ['ADMIN'],
      invitadoPor: {
        id: 'persona-2',
        nombres: 'Luis',
        apellidos: 'Gómez',
      },
    });
    expect(row).not.toHaveProperty('password');
    expect(row?.invitadoPor).not.toHaveProperty('password');
  });

  it('casts raw enum arrays before mapping the roles', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      {
        id: 'persona-1',
        rol: 'INTEGRANTE',
        roles: ['INTEGRANTE'],
      },
    ]);

    const rows = await service.findAll();

    expect(rows[0].roles).toEqual(['INTEGRANTE']);
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'CAST(persona.roles AS text[])',
      'roles',
    );
  });

  it('returns every selected scalar and flattened relation without sensitive keys', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        edad: 31,
        celular: '3001234567',
        tipoDocumento: 'C.C',
        documento: '123',
        genero: 'FEMENINO',
        direccion: 'Calle 1',
        correo: 'ana@example.com',
        encuentro: true,
        barrio: 'Centro',
        departamento: 'Cundinamarca',
        ciudad: 'Bogotá',
        fechaNacimiento: '1995-01-01',
        idRed: 'red-1',
        redNombre: 'Red Norte',
        invitadoPorId: 'persona-2',
        invitadoPorNombre: 'Luis Gómez',
        fechaCreacion: '2026-07-01T00:00:00.000Z',
        fechaModificacion: '2026-07-02T00:00:00.000Z',
        password: 'secret',
        rol: 'ADMIN',
        roles: ['ADMIN'],
        red: { id: 'red-1', nombre: 'Red Norte' },
        invitadoPor: { id: 'persona-2', nombres: 'Luis', apellidos: 'Gómez' },
      },
    ]);

    const rows = await service.findExportRows();

    expect(rows).toEqual([
      {
        id: 'persona-1',
        nombres: 'Ana',
        apellidos: 'Pérez',
        edad: 31,
        celular: '3001234567',
        tipoDocumento: 'C.C',
        documento: '123',
        genero: 'FEMENINO',
        direccion: 'Calle 1',
        correo: 'ana@example.com',
        encuentro: true,
        barrio: 'Centro',
        departamento: 'Cundinamarca',
        ciudad: 'Bogotá',
        fechaNacimiento: '1995-01-01',
        idRed: 'red-1',
        redNombre: 'Red Norte',
        invitadoPorId: 'persona-2',
        invitadoPorNombre: 'Luis Gómez',
        fechaCreacion: '2026-07-01T00:00:00.000Z',
        fechaModificacion: '2026-07-02T00:00:00.000Z',
      },
    ]);

    expect(Object.keys(rows[0])).not.toEqual(
      expect.arrayContaining([
        'password',
        'rol',
        'roles',
        'red',
        'invitadoPor',
      ]),
    );

    expect(queryBuilder.select).toHaveBeenCalledWith('persona.id', 'id');

    const selectedAliases = [
      'id',
      ...queryBuilder.addSelect.mock.calls.map(
        (call: [string, string]) => call[1],
      ),
    ];
    expect(selectedAliases).toEqual([
      'id',
      'nombres',
      'apellidos',
      'edad',
      'celular',
      'tipoDocumento',
      'documento',
      'genero',
      'direccion',
      'correo',
      'encuentro',
      'barrio',
      'departamento',
      'ciudad',
      'fechaNacimiento',
      'idRed',
      'redNombre',
      'invitadoPorId',
      'invitadoPorNombre',
      'fechaCreacion',
      'fechaModificacion',
    ]);
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'persona.apellidos',
      'ASC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenNthCalledWith(
      1,
      'persona.nombres',
      'ASC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenNthCalledWith(
      2,
      'persona.id',
      'ASC',
    );
  });
});

describe('PersonasService census rows', () => {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const personaRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  } as unknown as Repository<Persona>;
  const redRepository = {
    findOneBy: jest.fn(),
  } as unknown as Repository<Red>;
  const service = new PersonasService(personaRepository, redRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires a Red before querying census rows', async () => {
    await expect(service.findCensoRows()).rejects.toThrow(
      'Debes seleccionar una red',
    );
    expect(redRepository.findOneBy).not.toHaveBeenCalled();
    expect(personaRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent Red before reading people', async () => {
    redRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findCensoRows('red-404')).rejects.toThrow(
      'La red seleccionada no existe',
    );
    expect(redRepository.findOneBy).toHaveBeenCalledWith({ id: 'red-404' });
    expect(personaRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('filters in SQL by the selected Red and returns only safe census columns', async () => {
    redRepository.findOneBy.mockResolvedValue({
      id: 'red-1',
      nombre: 'Red Norte',
    });
    queryBuilder.getRawMany.mockResolvedValue([
      {
        nombres: 'Ana',
        apellidos: 'Pérez',
        documento: '123456',
        celular: '3001234567',
        fechaNacimiento: '1995-01-01',
        correo: 'ana@example.com',
        encuentro: true,
        password: 'secret',
        roles: ['ADMIN'],
      },
    ]);

    const response = await service.findCensoRows('red-1');

    expect(response).toEqual({
      redId: 'red-1',
      redNombre: 'Red Norte',
      rows: [
        {
          nombres: 'Ana',
          apellidos: 'Pérez',
          documento: '123456',
          celular: '3001234567',
          fechaNacimiento: '1995-01-01',
          correo: 'ana@example.com',
          encuentro: true,
        },
      ],
    });
    expect(queryBuilder.where).toHaveBeenCalledWith('persona.idRed = :redId', {
      redId: 'red-1',
    });

    const selectedAliases = [
      queryBuilder.select.mock.calls[0][1],
      ...queryBuilder.addSelect.mock.calls.map(
        (call: [string, string]) => call[1],
      ),
    ];
    expect(selectedAliases).toEqual([
      'nombres',
      'apellidos',
      'documento',
      'celular',
      'fechaNacimiento',
      'correo',
      'encuentro',
    ]);
    expect(selectedAliases).not.toEqual(
      expect.arrayContaining(['password', 'roles', 'rol', 'id']),
    );
    expect(response.rows[0]).not.toHaveProperty('password');
    expect(response.rows[0]).not.toHaveProperty('roles');
  });
});
