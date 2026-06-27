import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../common/enums/rol.enum.js';
import { ROLES_KEY } from './roles.decorator.js';
import { hasAnyRole } from '../../common/utils/role.util.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user: { rol?: Rol; roles?: Rol[] };
    }>();
    const user = request.user;
    return hasAnyRole(user, requiredRoles);
  }
}
