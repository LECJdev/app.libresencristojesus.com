import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/** `PATCH /kids/children/:id` body — optimistic locking via `version`, same convention as `UpdateKidsSchoolDto`. */
export class UpdateKidsChildDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString({}, { message: 'birthDate debe ser una fecha ISO (YYYY-MM-DD)' })
  birthDate?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  photo?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({ description: 'Optimistic locking counter — must match the current KidsChild.version.' })
  @IsInt()
  @Min(1)
  version!: number;
}
