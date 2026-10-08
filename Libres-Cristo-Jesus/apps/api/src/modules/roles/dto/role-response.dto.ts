import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@lcj/types';

/**
 * `CatRole` sanitized for API responses. `name` keeps the Spanish label
 * exactly as stored in the DB (doc04 §4 `CatRole`: id/name/description —
 * a plain catalog, no soft-delete/version columns), while `roleName` is
 * the English `RoleName` enum resolved via `ROLE_NAME_LABELS` (same
 * translation `UsersService`/`AuthService` already perform), so frontend
 * code can key off a type-safe enum instead of matching the Spanish string.
 */
export class RoleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Spanish label as stored in CatRole.name (e.g. "Pastor Distrito").' })
  name!: string;
  @ApiProperty({ enum: RoleName, description: 'English enum resolved from CatRole.name.' })
  roleName!: RoleName;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
