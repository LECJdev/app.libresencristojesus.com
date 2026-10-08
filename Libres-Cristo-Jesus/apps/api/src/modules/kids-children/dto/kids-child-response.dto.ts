import { ApiProperty } from '@nestjs/swagger';
import { RecordStatus } from '@prisma/client';

export class KidsChildResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() kidsSchoolId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() birthDate!: Date;
  /** Calculada desde `birthDate` en cada respuesta — nunca persistida (RN definitiva del diseño aprobado). */
  @ApiProperty() age!: number;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ enum: RecordStatus }) status!: RecordStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty() version!: number;
}
