import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@lcj/types';
import { JwtAuthGuard, type RequestWithUser } from './jwt-auth.guard';
import { TokenService } from '../token.service';
import { Public } from '../decorators/public.decorator';
import type { AppConfigService } from '../../config/app-config.service';

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

class PublicController {
  @Public()
  handler(this: void): void {
    /* no-op */
  }
}

function protectedHandler(): void {
  /* no-op */
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let tokenService: TokenService;
  const reflector = new Reflector();

  beforeEach(() => {
    const configServiceStub = {
      jwtSecret: 'test-access-secret',
      jwtRefreshSecret: 'test-refresh-secret',
    } as unknown as AppConfigService;
    tokenService = new TokenService(new JwtService(), configServiceStub);
    guard = new JwtAuthGuard(reflector, tokenService);
  });

  it('allows a route marked @Public() without a token', () => {
    const request: Partial<RequestWithUser> = { headers: {} };
    const context = createContext(request, PublicController.prototype.handler);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('rejects a request with no Authorization header', () => {
    const request: Partial<RequestWithUser> = { headers: {} };
    const context = createContext(request, protectedHandler);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a request whose Authorization header is not a Bearer token', () => {
    const request: Partial<RequestWithUser> = { headers: { authorization: 'Basic abc123' } };
    const context = createContext(request, protectedHandler);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a request with an invalid/malformed token', () => {
    const request: Partial<RequestWithUser> = {
      headers: { authorization: 'Bearer not-a-real-token' },
    };
    const context = createContext(request, protectedHandler);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('accepts a request with a valid token and attaches the decoded payload', () => {
    const token = tokenService.signAccessToken({
      sub: 'unit-1',
      memberId: 'member-1',
      username: 'pastor',
      role: RoleName.LEADER,
    });
    const request: Partial<RequestWithUser> = { headers: { authorization: `Bearer ${token}` } };
    const context = createContext(request, protectedHandler);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toMatchObject({
      sub: 'unit-1',
      username: 'pastor',
      role: RoleName.LEADER,
    });
  });
});
