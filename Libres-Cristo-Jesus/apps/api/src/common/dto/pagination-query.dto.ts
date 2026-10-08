import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Generic pagination/sort/search query params for future listing
 * endpoints (`Documentos/19 – API Contract Book.md`, sections 6
 * "Paginación" and 7 "Ordenamiento"/"Búsqueda"): `?page=1&pageSize=20`,
 * `?sort=name&order=asc`, `?search=jorge`.
 *
 * The global `ValidationPipe` (`main.ts`) has `transform: true`, so
 * query-string values are coerced to the declared types automatically.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsString()
  search?: string;
}
