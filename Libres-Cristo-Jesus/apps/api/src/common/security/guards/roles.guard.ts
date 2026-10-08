import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleName } from '@lcj/types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestWithUser } from './jwt-auth.guard';

/**
 * Compares the authenticated user's role (from the JWT payload
 * `JwtAuthGuard` attaches) against the roles a route allows via
 * `@Roles(...)`. A route with no `@Roles(...)` metadata is allowed for
 * any authenticated user — this guard only narrows access.
 *
 * Scope (District/Casa de Paz) is explicitly NOT checked here — per
 * this phase's brief, scoping is future business logic; this guard only
 * implements the generic role mechanism.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authenticated user required');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this action');
    }

    return true;
  }
}
