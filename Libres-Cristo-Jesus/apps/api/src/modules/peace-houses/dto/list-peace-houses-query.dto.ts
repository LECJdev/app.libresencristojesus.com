import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecordStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /peace-houses` query params: the generic `PaginationQueryDto`
 * (page/pageSize/sort/order/search) plus the filters the listing screen
 * actually offers.
 *
 * `search` matches `name`, `code`, `neighborhood` and `address` — a user
 * looking for a Casa de Paz types whatever they remember, and a name-only
 * search silently fails them when what they remember is the code.
 *
 * The geographic filters take catalog UUIDs, never names: the catalogs are
 * the single source of truth (`CatDepartment`/`CatMunicipality`), so
 * filtering by a typed-in name would reintroduce exactly the free-text
 * matching the catalogs replaced.
 */
export class ListPeaceHousesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter Casas de Paz belonging to this District.' })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ description: 'Filter by CatDepartment id.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by CatMunicipality id.' })
  @IsOptional()
  @IsUUID()
  municipalityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by the LeadershipUnit currently leading the Casa de Paz.',
  })
  @IsOptional()
  @IsUUID()
  leadershipUnitId?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
