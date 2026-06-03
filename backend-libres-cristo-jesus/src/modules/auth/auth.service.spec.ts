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

    expect(personasService.findByCorreo).toHaveBeenCalledWith('admin@correo.com');
    expect(personasService.findByCelular).not.toHaveBeenCalled();
    expect(result.access_token).toBe('signed-token');
  });

  it('authenticates admins by celular when identifier is not an email', async () => {
    personasService.findByCelular.mockResolvedValue({
      id: 'admin-2',
      nombres: 'Admin',
      apellidos: 'Celular',
      rol: Rol.ADMIN,
      password: await bcrypt.hash('secret', 10),
    });

    await service.loginAdmin(' 300-123-4567 ', 'secret');

    expect(personasService.findByCelular).toHaveBeenCalledWith('3001234567');
    expect(personasService.findByCorreo).not.toHaveBeenCalled();
  });

  it('keeps PERSONAL_ADMINISTRATIVO login working with correo plus documento password', async () => {
    personasService.findByCorreo.mockResolvedValue({
      id: 'admin-3',
      nombres: 'Admin',
      apellidos: 'Promovido',
      rol: Rol.PERSONAL_ADMINISTRATIVO,
      password: await bcrypt.hash('DOC12345', 10),
    });

    const result = await service.loginAdmin('persona@correo.com', 'DOC12345');

    expect(personasService.findByCorreo).toHaveBeenCalledWith('persona@correo.com');
    expect(result.user.rol).toBe(Rol.PERSONAL_ADMINISTRATIVO);
  });

  it('authenticates the legacy super admin username and issues SUPER_ADMIN JWT payload', async () => {
    const result = await service.loginAdmin(' useroot ', 'librespass@26');

    expect(personasService.findByCorreo).not.toHaveBeenCalled();
    expect(personasService.findByCelular).not.toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'legacy-super-admin',
      rol: Rol.SUPER_ADMIN,
    });
    expect(result.user.rol).toBe(Rol.SUPER_ADMIN);
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
    });
    expect(result.user.id).toBe('legacy-root');
  });

  it('rejects invalid celular identifiers as unauthorized', async () => {
    await expect(service.loginAdmin('not-a-phone', 'secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
