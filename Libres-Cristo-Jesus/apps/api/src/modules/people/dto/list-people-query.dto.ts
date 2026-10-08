import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecordStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /people` query params.
 *
 * `search` spans firstName, lastName, document, phone and email: someone
 * looking for an attendee types whatever they remember, and a name-only
 * search fails the very common case of "I have her number".
 */
export class ListPeopleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Personas vinculadas a esta Casa de Paz.' })
  @IsOptional()
  @IsUUID()
  peaceHouseId?: string;

  @ApiPropertyOptional({ description: 'Etapa del proceso pastoral.' })
  @IsOptional()
  @IsUUID()
  personStageId?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
