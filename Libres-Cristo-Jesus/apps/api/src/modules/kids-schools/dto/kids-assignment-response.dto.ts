import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KidsAssignmentRole } from '@prisma/client';

export class KidsAssignmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() kidsSchoolId!: string;
  @ApiProperty() leadershipUnitId!: string;
  @ApiProperty({ enum: KidsAssignmentRole }) role!: KidsAssignmentRole;
  @ApiProperty() canCreateChild!: boolean;
  @ApiProperty() startDate!: Date;
  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description: 'Null mientras la asignación está activa.',
  })
  endDate!: Date | null;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty() createdAt!: Date;
}
