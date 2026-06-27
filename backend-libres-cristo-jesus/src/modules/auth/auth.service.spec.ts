import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PersonasService } from '../personas/personas.service';
import { Rol } from '../../common/enums/rol.enum';

describe('AuthService', () => {
  let service: AuthService;
  const personasService = {
    findByCorreo: jest.fn(),
    findByCelular: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn().mockReturnValue('signed-token'),
  };

  const configService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PersonasService, useValue: personasService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('authenticates admins by correo when identifier looks like email', async () => {
    personasService.findByCorreo.mockResolvedValue({
      id: 'admin-1',
      nombres: 'Admin',
      apellidos: 'Correo',
      rol: Rol.ADMIN,
      password: await bcrypt.hash('secret', 10),
    });

    const result = await service.loginAdmin('ADMIN@correo.com ', 'secret');

    expect(personasService.findByCorreo).toHaveBeenCalledWith(
      'admin@correo.com',
    );
    expect(personasService.findByCelular).not.toHaveBeenCalled();
    expect(result.access_token).toBe('signed-token');
  });

  it('rejects non-email identifiers for non-legacy users', async () => {
    await expect(
      service.loginAdmin(' 300-123-4567 ', 'secret'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(personasService.findByCorreo).not.toHaveBeenCalled();
    expect(personasService.findByCelular).not.toHaveBeenCalled();
  });

  it('keeps PERSONAL_ADMINISTRATIVO login working with correo plus documento password', async () => {
    personasService.findByCorreo.mockResolvedValue({
      id: 'admin-3',
      nombres: 'Admin',
      apellidos: 'Promovido',
      rol: Rol.PERSONAL_ADMINISTRATIVO,
      roles: [Rol.PERSONAL_ADMINISTRATIVO],
      password: await bcrypt.hash('DOC12345', 10),
    });

    const result = await service.loginAdmin('persona@correo.com', 'DOC12345');

    expect(personasService.findByCorreo).toHaveBeenCalledWith(
      'persona@correo.com',
    );
    expect(result.user.rol).toBe(Rol.PERSONAL_ADMINISTRATIVO);
    expect(result.user.roles).toEqual([Rol.PERSONAL_ADMINISTRATIVO]);
  });

  it('allows login for LIDER_CASA_DE_PAZ users with their assigned credentials', async () => {
    personasService.findByCorreo.mockResolvedValue({
      id: 'lider-casa-paz-1',
      nombres: 'Casa',
      apellidos: 'Lider',
      rol: Rol.LIDER_CASA_DE_PAZ,
      roles: [Rol.LIDER_CASA_DE_PAZ],
      password: await bcrypt.hash('DOC54321', 10),
    });

    const result = await service.loginAdmin('lider@correo.com', 'DOC54321');

    expect(personasService.findByCorreo).toHaveBeenCalledWith(
      'lider@correo.com',
    );
    expect(result.user.rol).toBe(Rol.LIDER_CASA_DE_PAZ);
    expect(result.user.roles).toEqual([Rol.LIDER_CASA_DE_PAZ]);
  });

  it('authenticates the legacy super admin username and issues SUPER_ADMIN JWT payload', async () => {
    const result = await service.loginAdmin(' useroot ', 'librespass@26');

    expect(personasService.findByCorreo).not.toHaveBeenCalled();
    expect(personasService.findByCelular).not.toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'legacy-super-admin',
      rol: Rol.SUPER_ADMIN,
      roles: [Rol.SUPER_ADMIN],
    });
    expect(result.user.rol).toBe(Rol.SUPER_ADMIN);
    expect(result.user.roles).toEqual([Rol.SUPER_ADMIN]);
  });

  it('allows overriding legacy super admin credentials from config', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'LEGACY_SUPER_ADMIN_USERNAME') return 'rootadmin';
      if (key === 'LEGACY_SUPER_ADMIN_PASSWORD') return 'custom-pass';
      if (key === 'LEGACY_SUPER_ADMIN_ID') return 'legacy-root';
      return undefined;
    });

    const result = await service.loginAdmin('rootadmin', 'custom-pass');

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'legacy-root',
      rol: Rol.SUPER_ADMIN,
      roles: [Rol.SUPER_ADMIN],
    });
    expect(result.user.id).toBe('legacy-root');
  });

  it('keeps authorization working when a persona only has the legacy rol field', async () => {
    personasService.findByCorreo.mockResolvedValue({
      id: 'admin-legacy',
      nombres: 'Legacy',
      apellidos: 'Admin',
      rol: Rol.ADMIN,
      password: await bcrypt.hash('secret', 10),
    });

    const result = await service.loginAdmin('legacy@correo.com', 'secret');

    expect(result.user.rol).toBe(Rol.ADMIN);
    expect(result.user.roles).toEqual([Rol.ADMIN]);
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'admin-legacy',
      rol: Rol.ADMIN,
      roles: [Rol.ADMIN],
    });
  });

  it('uses the highest-privilege role as legacy rol compatibility field', async () => {
    personasService.findByCorreo.mockResolvedValue({
      id: 'admin-multi',
      nombres: 'Multi',
      apellidos: 'Role',
      rol: Rol.PERSONAL_ADMINISTRATIVO,
      roles: [Rol.PERSONAL_ADMINISTRATIVO, Rol.ADMIN],
      password: await bcrypt.hash('secret', 10),
    });

    const result = await service.loginAdmin('multi@correo.com', 'secret');

    expect(result.user.rol).toBe(Rol.ADMIN);
    expect(result.user.roles).toEqual([Rol.ADMIN, Rol.PERSONAL_ADMINISTRATIVO]);
  });

  it('rejects invalid non-email identifiers as unauthorized', async () => {
    await expect(
      service.loginAdmin('not-a-phone', 'secret'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
