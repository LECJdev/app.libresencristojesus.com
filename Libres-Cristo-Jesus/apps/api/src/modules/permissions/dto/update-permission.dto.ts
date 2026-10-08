import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * `PATCH /permissions/:id` body. Deliberately only has `description` —
 * `resource`/`action` together are the identity `ScopeGuard` already
 * matches against in production (`ScopeGuard.checkPermission`, matching
 * `permission.resource`/`permission.action` to the route's
 * `@RequirePermission(resource, action)` metadata). Renaming either field
 * on an in-use `Permission` would silently detach every existing
 * `RolePermission` grant from the routes it's supposed to protect. If a
 * different `(resource, action)` pair is needed, create a new `Permission`
 * row instead — `PermissionsService.remove` still lets the old one be
 * soft-deleted once its grants are revoked.
 */
export class UpdatePermissionDto {
  @ApiProperty({ nullable: true, example: 'district module — create a new District' })
  @IsString()
  description!: string;
}
