import { ApiProperty } from '@nestjs/swagger';
import type { RecordStatus } from '@prisma/client';

/** `SystemSetting` sanitized for API responses (doc04 "Mejoras" §3). */
export class SettingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'church.timezone' }) key!: string;
  @ApiProperty({ example: 'America/Bogota' }) value!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() status!: RecordStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty({ description: 'Optimistic locking counter.' }) version!: number;
}
