import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * `POST /kids/children/:id/guardians` body — vincula un acudiente al niño.
 *
 * Dos modos, decididos por presencia de `guardianId` (para hermanos que ya
 * comparten un acudiente registrado, sin duplicarlo):
 * - `guardianId` presente → vincula el `KidsGuardian` existente (el resto de
 *   los campos se ignora).
 * - `guardianId` ausente → crea un `KidsGuardian` nuevo con los datos dados;
 *   `firstName`/`lastName`/`relationship`/`phone` son obligatorios en ese
 *   caso (validado en el service, no acá, porque son condicionales al modo).
 */
export class CreateKidsGuardianDto {
  @ApiProperty({ required: false, description: 'Vincula un KidsGuardian existente en vez de crear uno nuevo.' })
  @IsOptional()
  @IsUUID()
  guardianId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, example: 'madre' })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  altPhone?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
    default: false,
    description: 'Marca este acudiente como principal para el niño — desmarca al anterior principal, si había uno.',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
