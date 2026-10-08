import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordStatus } from '@prisma/client';

export class MunicipalityResponseDto {
  @ApiProperty({ description: 'Internal UUID — the only key other entities reference.' })
  id!: string;

  @ApiProperty({ description: 'UUID of the department this municipality belongs to.' })
  departmentId!: string;

  @ApiProperty({ example: 'Medellín' })
  name!: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Official DANE code (5 digits). Null when the provider that populated this row does not publish it.',
  })
  codeDane!: string | null;

  @ApiProperty({ enum: RecordStatus })
  status!: RecordStatus;
}
