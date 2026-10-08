import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * `POST /people` body (doc04 §5).
 *
 * Only `firstName` and `lastName` are required. Everything else — document,
 * phone, email, stage, Casa de Paz — is optional on purpose: a first-time
 * visitor is registered at the door, mid-meeting, from a phone. A form that
 * demands a national id before it will save is a form that produces no
 * record at all, which is worse than a partial one.
 */
export class CreatePersonDto {
  @ApiProperty({ example: 'María' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName!: string;

  @ApiPropertyOptional({ description: 'Documento de identidad. Único cuando se informa.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  document?: string;

  @ApiPropertyOptional({ example: 'F' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'email debe ser un correo válido' })
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: '1990-05-14', description: 'ISO date (YYYY-MM-DD).' })
  @IsOptional()
  @IsDateString({}, { message: 'birthDate debe ser una fecha ISO (YYYY-MM-DD)' })
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'Ruta devuelta por POST /files/upload. Nunca una URL completa (doc04 §15).',
  })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ description: 'Observaciones pastorales.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'CatPersonStage.id — etapa del proceso pastoral.' })
  @IsOptional()
  @IsUUID()
  personStageId?: string;

  @ApiPropertyOptional({
    description:
      'Casa de Paz a la que se vincula. Abre el primer período de PersonPeaceHouseHistory.',
  })
  @IsOptional()
  @IsUUID()
  peaceHouseId?: string;
}
