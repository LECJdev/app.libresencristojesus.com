import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /permissions` query params: the generic `PaginationQueryDto`
 * (page/pageSize/sort/order/search) plus a `resource` filter, so the
 * frontend's "manage permissions" screen can list one module's permissions
 * at a time (e.g. `?resource=user`).
 */
export class ListPermissionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by resource name (e.g. "user", "role").' })
  @IsOptional()
  @IsString()
  resource?: string;
}
