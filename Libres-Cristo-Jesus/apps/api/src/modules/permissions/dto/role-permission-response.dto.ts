import { ApiProperty } from '@nestjs/swagger';
import { PermissionResponseDto } from './permission-response.dto';

/**
 * `RolePermission` sanitized for API responses. `RolePermission` is a
 * pure technical join table (no soft-delete/status/version columns —
 * `prisma/schema.prisma`), so this shape is intentionally thin. `permission`
 * is included so `GET /permissions/roles/:roleId` can return each grant's
 * `resource`/`action` without a second round trip from the client.
 */
export class RolePermissionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() roleId!: string;
  @ApiProperty() permissionId!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: PermissionResponseDto }) permission!: PermissionResponseDto;
}
