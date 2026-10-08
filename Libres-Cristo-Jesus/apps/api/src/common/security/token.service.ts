import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

/**
 * Reusable JWT signing/verification, decoupled from any login endpoint
 * (there isn't one yet — this phase only builds the mechanism). Access
 * and refresh tokens intentionally use two different secrets
 * (`JWT_SECRET`/`JWT_REFRESH_SECRET`), so `JwtModule` is registered with
 * no default options and every call here passes its secret explicitly.
 *
 * Durations per `Documentos/21 – Security Architecture & DevOps
 * Blueprint.md` section 4: access tokens expire in 15 minutes, refresh
 * tokens in 7 days.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.jwtSecret,
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  /**
   * Signs a refresh token with a unique `jti`.
   *
   * WHY THE `jti` IS NOT OPTIONAL
   * A JWT's `iat`/`exp` have one-second resolution, so signing the same
   * payload twice within the same second produced a BYTE-IDENTICAL token.
   * `AuthService.refresh` implements reuse detection by comparing the
   * presented token's hash against the stored session and wiping every
   * session when it does not match — but an identical rotation makes the
   * old token keep matching, so a stolen token replayed in that window is
   * indistinguishable from the legitimate one and detection silently does
   * nothing.
   *
   * `randomUUID()` guarantees every rotation yields a distinct token, which
   * is the property the whole reuse-detection scheme rests on. Found by the
   * end-to-end suite; a unit test with a mocked clock could not have seen
   * it.
   *
   * The claim is added at signing time only: `JwtPayload` stays the shape
   * the rest of the system reads (`sub`/`username`/`role`), so no guard,
   * decorator or service needs to know this exists.
   */
  signRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: REFRESH_TOKEN_TTL,
      },
    );
  }

  /** Throws (via `@nestjs/jwt` -> `jsonwebtoken`) if invalid/expired/tampered. */
  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.jwtSecret,
    });
  }

  /** Throws (via `@nestjs/jwt` -> `jsonwebtoken`) if invalid/expired/tampered. */
  verifyRefreshToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.jwtRefreshSecret,
    });
  }
}
