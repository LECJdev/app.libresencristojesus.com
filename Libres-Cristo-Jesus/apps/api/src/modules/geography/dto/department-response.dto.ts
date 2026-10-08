import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordStatus } from '@prisma/client';

export class DepartmentResponseDto {
  @ApiProperty({ description: 'Internal UUID — the only key other entities reference.' })
  id!: string;

  @ApiProperty({ example: 'Antioquia' })
  name!: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Official DANE code (2 digits). Null when the provider that populated this row does not publish it.',
  })
  codeDane!: string | null;

  @ApiProperty({ enum: RecordStatus })
  status!: RecordStatus;
}
