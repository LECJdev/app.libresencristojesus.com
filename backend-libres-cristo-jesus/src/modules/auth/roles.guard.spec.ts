import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../common/enums/rol.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const createContext = (user?: {
    rol?: Rol;
    roles?: Rol[];
  }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when any required role exists in roles array', () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([Rol.PERSONAL_ADMINISTRATIVO]);
    const guard = new RolesGuard(reflector);

    const canActivate = guard.canActivate(
      createContext({ roles: [Rol.ADMIN, Rol.PERSONAL_ADMINISTRATIVO] }),
    );

    expect(canActivate).toBe(true);
  });

  it('keeps legacy rol-only payloads working', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue([Rol.ADMIN]);
    const guard = new RolesGuard(reflector);

    const canActivate = guard.canActivate(createContext({ rol: Rol.ADMIN }));

    expect(canActivate).toBe(true);
  });
});
