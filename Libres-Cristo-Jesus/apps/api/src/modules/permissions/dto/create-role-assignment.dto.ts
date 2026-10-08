import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * `POST /permissions/role-assignments` body — grants one `Permission` to
 * one `CatRole` by creating a `RolePermission` row. Mirrors the Prisma
 * schema's real FK columns exactly (same convention as
 * `CreateUserDto.roleId`).
 */
export class CreateRoleAssignmentDto {
  @ApiProperty({ description: 'CatRole.id receiving the permission.' })
  @IsUUID()
  roleId!: string;

  @ApiProperty({ description: 'Permission.id being granted.' })
  @IsUUID()
  permissionId!: string;
}
