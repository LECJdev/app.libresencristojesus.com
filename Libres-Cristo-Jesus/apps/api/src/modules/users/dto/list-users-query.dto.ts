import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LeadershipUnitStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /users` query params (doc19 sections 6/7): the generic
 * `PaginationQueryDto` (page/pageSize/sort/order/search) plus the two
 * filters that make sense for a `LeadershipUnit` listing.
 */
export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadershipUnitStatus })
  @IsOptional()
  @IsEnum(LeadershipUnitStatus)
  status?: LeadershipUnitStatus;

  @ApiPropertyOptional({ description: 'Filter by CatRole id.' })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
