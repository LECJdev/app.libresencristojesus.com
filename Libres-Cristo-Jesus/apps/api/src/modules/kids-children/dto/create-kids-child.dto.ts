import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * `POST /kids/schools/:schoolId/children` body. `kidsSchoolId` is not part
 * of the payload — it comes from the route (`ScopeGuard` already confirmed
 * the actor's scope over it).
 *
 * `photo` is a `StorageService` path uploaded beforehand via
 * `POST /files/upload` (category `kids-child-photo`) — same two-step
 * pattern as `Person.photo`/`LeadershipUnit.photo`.
 */
export class CreateKidsChildDto {
  @ApiProperty({ example: 'Sofía' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Ramírez' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '2019-03-14' })
  @IsDateString({}, { message: 'birthDate debe ser una fecha ISO (YYYY-MM-DD)' })
  birthDate!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
