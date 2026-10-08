import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * `PUT /settings/:key` body.
 *
 * Upsert rather than separate create/update: a system parameter either
 * has a value or falls back to a default, and making the caller know
 * which of the two it is today turns "set the timezone" into a
 * read-then-branch dance for no benefit.
 */
export class UpsertSettingDto {
  @ApiProperty({
    example: 'America/Bogota',
    description: 'Raw value. Interpretation belongs to whoever reads the key.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
  value!: string;

  @ApiPropertyOptional({ description: 'Human explanation of what this key controls.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * Key format, validated on the route param.
 *
 * Restricted to `dotted.lower_snake` segments so keys stay predictable and
 * groupable (`church.*`, `pwa.*`). Without a rule, the same setting ends
 * up written three ways by three developers and read by none of them.
 */
export class SettingKeyParamDto {
  @ApiProperty({ example: 'church.timezone' })
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, {
    message:
      'key must be lowercase dot-separated segments, e.g. "church.timezone" or "pwa.offline_days"',
  })
  @MaxLength(120)
  key!: string;
}
