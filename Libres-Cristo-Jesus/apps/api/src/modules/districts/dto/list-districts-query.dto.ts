import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /districts` query params: the generic `PaginationQueryDto`
 * (page/pageSize/sort/order/search — `search` matches against `District.name`) plus a
 * `churchId` filter, since more than one `Church` may exist in the future
 * (`prisma/schema.prisma`'s comment above `District.number`).
 */
export class ListDistrictsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter districts belonging to this Church.' })
  @IsOptional()
  @IsUUID()
  churchId?: string;
}
