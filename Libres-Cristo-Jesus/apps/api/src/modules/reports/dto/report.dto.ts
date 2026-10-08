import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * The reports doc11 asks for. A closed enum rather than free text: the value
 * selects a query and a column list, so an unknown one is a 400 and never a
 * silently empty sheet.
 */
export enum ReportType {
  ATTENDANCE = 'attendance',
  OFFERINGS = 'offerings',
  PEOPLE = 'people',
  PEACE_HOUSES = 'peace-houses',
}

/**
 * ONE query shape for every report.
 *
 * They share filters because they answer the same question from different
 * angles ("what happened, in this district, between these dates"). A
 * per-report query object would let the same filter mean two things.
 *
 * Not every report honours every filter — `people` and `peace-houses`
 * describe a present state, so a date range does not apply to them. That is
 * declared in each definition rather than enforced here, so the API stays
 * one shape.
 */
export class ReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Limita a esta Casa de Paz.' })
  @IsOptional()
  @IsUUID()
  peaceHouseId?: string;

  @ApiPropertyOptional({ description: 'Limita a las Casas de Paz de este distrito.' })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ description: 'Desde esta fecha (inclusive), ISO-8601.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta esta fecha (inclusive), ISO-8601.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ReportTypeParamDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type!: ReportType;
}

/** One column, as the screen needs to render its header. */
export class ReportColumnDto {
  @ApiProperty() key!: string;
  @ApiProperty({ description: 'Encabezado visible, en español.' }) header!: string;
  @ApiProperty({
    enum: ['text', 'number', 'currency', 'date'],
    description: 'Cómo debe alinearse y formatearse la celda.',
  })
  format!: ReportCellFormat;
}

export type ReportCellFormat = 'text' | 'number' | 'currency' | 'date';

/**
 * A report preview.
 *
 * IT CARRIES ITS OWN COLUMNS. The screen does not hardcode headers per
 * report type — it renders whatever the definition declares, which is the
 * same list the Excel export writes. That is what keeps the sheet and the
 * table from drifting apart the first time a column is added.
 */
export class ReportPreviewDto {
  @ApiProperty({ enum: ReportType }) type!: ReportType;
  @ApiProperty({ description: 'Título del reporte, en español.' }) title!: string;
  @ApiProperty({ type: () => [ReportColumnDto] }) columns!: ReportColumnDto[];
  @ApiProperty({
    description: 'Filas ya formateadas como valores primitivos, en el orden de las columnas.',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  rows!: Record<string, string | number | null>[];
  @ApiProperty({ description: 'Qué abarca el reporte según el rol.' }) scopeLabel!: string;
}
