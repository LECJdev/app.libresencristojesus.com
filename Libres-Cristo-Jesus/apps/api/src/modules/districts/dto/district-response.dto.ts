import { ApiProperty } from '@nestjs/swagger';
import type { RecordStatus } from '@prisma/client';

/** `District` sanitized for API responses (doc04 §4, doc06). */
export class DistrictResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() churchId!: string;
  @ApiProperty() number!: number;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ nullable: true, type: String }) leadershipUnitId!: string | null;
  @ApiProperty() status!: RecordStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty({ description: 'Optimistic locking counter.' }) version!: number;
}
