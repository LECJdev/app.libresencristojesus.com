import { ApiProperty } from '@nestjs/swagger';
import type { RecordStatus } from '@prisma/client';

/**
 * `Church` sanitized for API responses — "Organización" in the business language
 * of `Documentos/06-modulo-organizacion.md`. `status`/`version`/`createdBy`/
 * `updatedBy` are exposed because `Church` carries the full "main table" column
 * set (`prisma/schema.prisma`, doc04 §13/§14 convention).
 */
export class OrganizationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) logo!: string | null;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: String }) primaryColor!: string | null;
  @ApiProperty({ nullable: true, type: String }) secondaryColor!: string | null;
  @ApiProperty({ nullable: true, type: String }) address!: string | null;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty() status!: RecordStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty({ description: 'Optimistic locking counter.' }) version!: number;
}
