import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@lcj/types';
import { TokenService } from './token.service';
import type { AppConfigService } from '../config/app-config.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

describe('TokenService', () => {
  let tokenService: TokenService;

  const samplePayload: JwtPayload = {
    sub: 'leadership-unit-id-123',
    memberId: 'leadership-unit-id-123-member',
    username: 'pastor.principal',
    role: RoleName.ADMIN,
  };

  beforeEach(() => {
    const configServiceStub = {
      jwtSecret: 'test-access-secret',
      jwtRefreshSecret: 'test-refresh-secret',
    } as unknown as AppConfigService;

    tokenService = new TokenService(new JwtService(), configServiceStub);
  });

  it('signs and verifies an access token round-trip', () => {
    const token = tokenService.signAccessToken(samplePayload);
    expect(typeof token).toBe('string');

    const decoded = tokenService.verifyAccessToken(token);
    expect(decoded).toMatchObject(samplePayload);
  });

  it('signs and verifies a refresh token round-trip', () => {
    const token = tokenService.signRefreshToken(samplePayload);
    const decoded = tokenService.verifyRefreshToken(token);
    expect(decoded).toMatchObject(samplePayload);
  });

  it('rejects an access token when verified with the refresh secret', () => {
    const token = tokenService.signAccessToken(samplePayload);
    expect(() => tokenService.verifyRefreshToken(token)).toThrow();
  });

  it('rejects a refresh token when verified with the access secret', () => {
    const token = tokenService.signRefreshToken(samplePayload);
    expect(() => tokenService.verifyAccessToken(token)).toThrow();
  });

  it('rejects a tampered token', () => {
    const token = tokenService.signAccessToken(samplePayload);
    expect(() => tokenService.verifyAccessToken(`${token}tampered`)).toThrow();
  });

  it('embeds the documented expiry windows (15m access / 7d refresh)', () => {
    const accessToken = tokenService.signAccessToken(samplePayload);
    const refreshToken = tokenService.signRefreshToken(samplePayload);

    const decodedAccess = tokenService.verifyAccessToken(accessToken) as JwtPayload & {
      iat: number;
      exp: number;
    };
    const decodedRefresh = tokenService.verifyRefreshToken(refreshToken) as JwtPayload & {
      iat: number;
      exp: number;
    };

    expect(decodedAccess.exp - decodedAccess.iat).toBe(15 * 60);
    expect(decodedRefresh.exp - decodedRefresh.iat).toBe(7 * 24 * 60 * 60);
  });
});
