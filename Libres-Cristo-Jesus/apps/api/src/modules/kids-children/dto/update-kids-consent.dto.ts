import { ApiProperty } from '@nestjs/swagger';
import { KidsConsentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * `PATCH /kids/children/:id/consent` body.
 *
 * - `documentPath` presente (primera carga o reemplazo) → transiciona a
 *   `ACTIVE` siempre, sin importar qué traiga `status` — cargar el
 *   documento firmado ES la activación.
 * - `documentPath` ausente y `status: INACTIVE` → revocación manual
 *   explícita (el documento ya cargado se conserva como referencia
 *   histórica, no se borra).
 */
export class UpdateKidsConsentDto {
  @ApiProperty({
    required: false,
    description: 'Path devuelto por POST /files/upload (categoría kids-consent-document).',
  })
  @IsOptional()
  @IsString()
  documentPath?: string;

  @ApiProperty({ required: false, description: 'Fecha en que el documento físico fue firmado.' })
  @IsOptional()
  @IsDateString({}, { message: 'signedAt debe ser una fecha ISO (YYYY-MM-DD)' })
  signedAt?: string;

  @ApiProperty({ required: false, enum: KidsConsentStatus })
  @IsOptional()
  @IsEnum(KidsConsentStatus)
  status?: KidsConsentStatus;
}
