import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * `POST /kids/schools` body — creates a `KidsSchool` (una sede de Escuela
 * Kids, ej. "Escuela Kids Norte"/"Sur"). ADMIN only — `prisma/seed.ts`'s
 * `KIDS_SCHOOL_PERMISSIONS` concede `create` exclusivamente a ADMIN, nunca a
 * KIDS_LEADER/KIDS_ASSISTANT (crear/administrar la sede es la única
 * diferencia real entre los dos roles Kids).
 */
export class CreateKidsSchoolDto {
  @ApiProperty({ example: 'Escuela Kids Norte' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
