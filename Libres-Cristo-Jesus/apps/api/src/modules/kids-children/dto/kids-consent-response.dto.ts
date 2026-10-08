import { ApiProperty } from '@nestjs/swagger';
import { KidsConsentStatus } from '@prisma/client';

export class KidsConsentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() kidsChildId!: string;
  @ApiProperty({ enum: KidsConsentStatus }) status!: KidsConsentStatus;
  @ApiProperty({ nullable: true, type: String }) documentPath!: string | null;
  @ApiProperty({ nullable: true, type: Date }) signedAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date }) uploadedAt!: Date | null;
  @ApiProperty({ nullable: true, type: String }) uploadedBy!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() version!: number;
}
