import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * `PATCH /kids/schools/:id` body. `version` es obligatorio (optimistic
 * locking, misma convención que `UpdatePeaceHouseDto`) — `KidsSchoolsService.update`
 * lo compara contra `KidsSchool.version` y rechaza con 409 si no coincide.
 */
export class UpdateKidsSchoolDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ description: 'Optimistic locking counter — must match the current KidsSchool.version.' })
  @IsInt()
  @Min(1)
  version!: number;
}
