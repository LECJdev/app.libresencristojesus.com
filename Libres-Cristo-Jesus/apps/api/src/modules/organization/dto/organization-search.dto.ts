import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

/**
 * `GET /organizations/search` — the global search of doc06 §12
 * ("Distrito, Casa, Líder, Pastor, Municipio, Departamento").
 *
 * One endpoint rather than five: the user types a word and wants to know
 * where it appears, not to choose in advance which of five lists to look
 * in. Five round trips from the browser would also make the result order
 * arrive in whatever sequence the network decided.
 */
export class OrganizationSearchQueryDto {
  @ApiProperty({ example: 'esperanza', minLength: 2 })
  @IsString()
  @MinLength(2, { message: 'Ingrese al menos 2 caracteres para buscar.' })
  q!: string;

  @ApiPropertyOptional({
    default: 5,
    maximum: 20,
    description: 'Maximum hits PER GROUP, not in total.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 5;
}

/**
 * One hit. Deliberately flat and uniform across groups so the UI renders a
 * single list component instead of five — the shape is what the user sees,
 * not the table it came from.
 */
export class SearchHitDto {
  @ApiProperty({ description: 'Entity id. Not present for catalog rows without a screen.' })
  id!: string;

  @ApiProperty({ example: 'Casa de Paz Esperanza' })
  title!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Distrito 09 · Medellín',
    description: 'Context that disambiguates two entities with the same name.',
  })
  subtitle!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '/casas-de-paz',
    description: 'Frontend route where this entity lives, when it has one.',
  })
  href!: string | null;
}

export class OrganizationSearchResultDto {
  @ApiProperty({ type: [SearchHitDto] }) districts!: SearchHitDto[];
  @ApiProperty({ type: [SearchHitDto] }) peaceHouses!: SearchHitDto[];
  @ApiProperty({ type: [SearchHitDto], description: 'Pastores y Líderes.' })
  leaderships!: SearchHitDto[];
  @ApiProperty({ type: [SearchHitDto] }) municipalities!: SearchHitDto[];
  @ApiProperty({ type: [SearchHitDto] }) departments!: SearchHitDto[];

  @ApiProperty({ description: 'Sum across every group — drives the "sin resultados" state.' })
  total!: number;

  @ApiProperty({ description: 'True when results were narrowed to the caller scope.' })
  scoped!: boolean;
}
