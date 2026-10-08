import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@lcj/types';

export const ROLES_KEY = 'roles';

/**
 * Declares which roles may access a route/controller, e.g.
 * `@Roles(RoleName.ADMIN, RoleName.GENERAL_PASTOR)`. Read by
 * `RolesGuard`, which compares this list against the authenticated
 * user's `role` (from the JWT payload). A route with no `@Roles(...)`
 * at all is allowed for any authenticated user — this decorator only
 * narrows access, it never grants it on its own (that's `JwtAuthGuard`'s
 * job).
 */
export const Roles = (...roles: RoleName[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
