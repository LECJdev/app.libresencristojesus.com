import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../token.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/** `express.Request` widened with the field this guard attaches. */
export interface RequestWithUser extends Request {
  user?: JwtPayload;
}

/**
 * Validates the `Authorization: Bearer <token>` header against
 * `TokenService` and attaches the decoded payload to `request.user`.
 * Routes/controllers marked `@Public()` skip validation entirely.
 *
 * Registered as a global guard via `APP_GUARD` in `CommonModule` (secure
 * by default), so it currently has nothing to authenticate against in
 * production yet (no login endpoint issues real tokens until the
 * Authentication module lands) — it's still fully functional against
 * any token `TokenService` itself signs, which is what this phase's
 * tests exercise.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      request.user = this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private extractTokenFromHeader(request: RequestWithUser): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
