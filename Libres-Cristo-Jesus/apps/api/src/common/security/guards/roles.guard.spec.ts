import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@lcj/types';
import { RolesGuard } from './roles.guard';
import { Roles } from '../decorators/roles.decorator';
import type { RequestWithUser } from './jwt-auth.guard';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

function createContext(request: Partial<RequestWithUser>, handler: () => void): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

const adminUser: JwtPayload = {
  sub: 'unit-1',
  memberId: 'member-1',
  username: 'admin',
  role: RoleName.ADMIN,
};
const leaderUser: JwtPayload = {
  sub: 'unit-2',
  memberId: 'member-2',
  username: 'leader',
  role: RoleName.LEADER,
};

function plainHandler(): void {
  /* no-op */
}

class AdminOrGeneralPastorController {
  @Roles(RoleName.ADMIN, RoleName.GENERAL_PASTOR)
  handler(this: void): void {
    /* no-op */
  }
}

class AdminOnlyController {
  @Roles(RoleName.ADMIN)
  handler(this: void): void {
    /* no-op */
  }
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows any authenticated user when no @Roles() is set', () => {
    const request: Partial<RequestWithUser> = { user: leaderUser };
    expect(guard.canActivate(createContext(request, plainHandler))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    const request: Partial<RequestWithUser> = { user: adminUser };
    expect(
      guard.canActivate(createContext(request, AdminOrGeneralPastorController.prototype.handler)),
    ).toBe(true);
  });

  it('rejects a user whose role is not in the required list', () => {
    const request: Partial<RequestWithUser> = { user: leaderUser };
    expect(() =>
      guard.canActivate(createContext(request, AdminOnlyController.prototype.handler)),
    ).toThrow(ForbiddenException);
  });

  it('rejects when roles are required but no user is present on the request', () => {
    const request: Partial<RequestWithUser> = {};
    expect(() =>
      guard.canActivate(createContext(request, AdminOnlyController.prototype.handler)),
    ).toThrow(ForbiddenException);
  });
});
