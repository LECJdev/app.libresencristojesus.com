import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;
export const HEX_COLOR_MESSAGE = 'must be a 6-digit hex color (e.g. "#1A2B3C")';

/**
 * `POST /organizations` body — creates a `Church` row
 * (`Documentos/04-modelo-de-datos.md` section 4; "Organización" in the business
 * language of `Documentos/06-modulo-organizacion.md` maps to the `Church` table —
 * there is no `Organization` table). `Church` is the root of the
 * `Church -> District -> PeaceHouse` hierarchy (doc06 section 2), built ahead of a
 * future multi-church deployment — only one `Church` row exists today (see the
 * comment above `District.number` in `prisma/schema.prisma`).
 *
 * `primaryColor`/`secondaryColor` validate as 6-digit hex colors. Doc06 section 17
 * only names the institutional palette conceptually ("Azul, Dorado, Blanco — nunca
 * colores fuertes") and `Documentos/18 – Especificación de Componentes del Design
 * System.md` defines no concrete hex codes/format, so this DTO falls back to the
 * conventional `#RRGGBB` regex.
 */
export class CreateOrganizationDto {
  @ApiProperty({ example: 'Libres en Cristo Jesús' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Free-text description of the church.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Path/URL to the stored logo file.',
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ required: false, nullable: true, example: '#1A2B3C' })
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  primaryColor?: string;

  @ApiProperty({ required: false, nullable: true, example: '#D4AF37' })
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: HEX_COLOR_MESSAGE })
  secondaryColor?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, nullable: true, example: '+57 300 000 0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, nullable: true, example: 'contacto@libresencristojesus.org' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
