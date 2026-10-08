import { ApiProperty } from '@nestjs/swagger';

export class KidsGuardianResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() relationship!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true, type: String }) altPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() version!: number;
}
