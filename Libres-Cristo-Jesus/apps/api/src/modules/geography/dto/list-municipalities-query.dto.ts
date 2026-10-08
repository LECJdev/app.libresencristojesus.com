import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /geography/municipalities`. `departmentId` is the filter that
 * matters in practice: the Casa de Paz form asks for a department first,
 * then narrows the municipality list — loading all 1,123 at once would be
 * an unusable select on a phone.
 */
export class ListMunicipalitiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only municipalities belonging to this department.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
