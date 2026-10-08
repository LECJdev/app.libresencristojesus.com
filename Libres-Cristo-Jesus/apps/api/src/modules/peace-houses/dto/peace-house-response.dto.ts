import { ApiProperty } from '@nestjs/swagger';
import type { RecordStatus } from '@prisma/client';

/** `PeaceHouse` sanitized for API responses (doc04 §4, doc07). */
export class PeaceHouseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() districtId!: string;
  @ApiProperty() leadershipUnitId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) code!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'CatDepartment UUID.' })
  departmentId!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'CatMunicipality UUID.' })
  municipalityId!: string | null;
  @ApiProperty({ nullable: true, type: String }) neighborhood!: string | null;
  @ApiProperty({ nullable: true, type: String }) address!: string | null;
  @ApiProperty({ nullable: true, type: Number }) latitude!: number | null;
  @ApiProperty({ nullable: true, type: Number }) longitude!: number | null;
  @ApiProperty({ nullable: true, type: String }) meetingDay!: string | null;
  @ApiProperty({ nullable: true, type: String }) meetingHour!: string | null;
  @ApiProperty() status!: RecordStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty({ description: 'Optimistic locking counter.' }) version!: number;
}
