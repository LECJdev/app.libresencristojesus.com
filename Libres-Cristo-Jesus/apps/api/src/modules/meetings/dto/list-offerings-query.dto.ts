import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * `GET /offerings` — el historial que pide la Fase 8.
 *
 * The date filters work on `Meeting.meetingDate`, not on when the offering
 * was typed in: a leader reporting on Tuesday for last Thursday belongs in
 * last Thursday's figures, or every monthly total is wrong at the edges.
 */
export class ListOfferingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Ofrendas de esta Casa de Paz.' })
  @IsOptional()
  @IsUUID()
  peaceHouseId?: string;

  @ApiPropertyOptional({ description: 'Ofrendas de las Casas de Paz de este distrito.' })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ description: 'Desde esta fecha de reunión (inclusive), ISO-8601.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta esta fecha de reunión (inclusive), ISO-8601.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class OfferingHistoryRowDto {
  @ApiProperty() id!: string;
  @ApiProperty() meetingId!: string;
  @ApiProperty() peaceHouseId!: string;
  @ApiProperty() peaceHouseName!: string;
  @ApiProperty() meetingDate!: Date;
  @ApiProperty() isoYear!: number;
  @ApiProperty() isoWeek!: number;
  @ApiProperty({ description: 'Valor en COP.' }) amount!: number;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
}

/**
 * `GET /offerings/summary` — las estadísticas que pide la Fase 8.
 *
 * `average` is per REGISTERED offering, not per week on the calendar: a
 * week nobody reported is missing data, and counting it as zero would
 * quietly punish a Casa de Paz for a leader who was late with the form.
 */
export class OfferingSummaryDto {
  @ApiProperty({ description: 'Suma de todas las ofrendas del filtro, en COP.' })
  total!: number;
  @ApiProperty({ description: 'Cuántas ofrendas se registraron.' }) count!: number;
  @ApiProperty({ description: 'Promedio por ofrenda registrada, en COP.' }) average!: number;
  @ApiProperty({ nullable: true, type: Number }) min!: number | null;
  @ApiProperty({ nullable: true, type: Number }) max!: number | null;
  @ApiProperty({ type: () => [OfferingPeriodDto], description: 'Totales por semana ISO.' })
  byWeek!: OfferingPeriodDto[];
}

export class OfferingPeriodDto {
  @ApiProperty() isoYear!: number;
  @ApiProperty() isoWeek!: number;
  @ApiProperty() total!: number;
  @ApiProperty() count!: number;
}
