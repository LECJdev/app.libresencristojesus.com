import { ApiProperty } from '@nestjs/swagger';
import type { RecordStatus } from '@prisma/client';

/**
 * `Permission` sanitized for API responses. `status`/`version`/`createdBy`/
 * `updatedBy` are exposed because `Permission` carries the full "main
 * table" column set (`prisma/schema.prisma`), unlike `CatRole`/
 * `RolePermission` which are plain catalogs/join tables.
 */
export class PermissionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() resource!: string;
  @ApiProperty() action!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() status!: RecordStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty({ description: 'Optimistic locking counter.' }) version!: number;
}
