import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * One indicator with the month-over-month comparison the design calls for
 * ("128 asistentes · +12 % vs mes anterior").
 */
export class DashboardKpiDto {
  @ApiProperty({ description: 'Valor del período actual.' })
  current!: number;

  @ApiProperty({ description: 'Mismo indicador en el período anterior.' })
  previous!: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    description:
      'Variación porcentual. NULL cuando el período anterior fue cero: crecer desde nada no es un porcentaje, y mostrar "+100 %" o "∞" sería inventar una cifra.',
  })
  changePercent!: number | null;
}

/** `GET /dashboard/summary` — los cuatro indicadores de la pantalla. */
export class DashboardSummaryDto {
  @ApiProperty({
    type: () => DashboardKpiDto,
    description: 'Personas distintas marcadas como presentes en el mes.',
  })
  attendees!: DashboardKpiDto;

  @ApiProperty({ type: () => DashboardKpiDto, description: 'Ofrendas del mes, en COP.' })
  offerings!: DashboardKpiDto;

  @ApiProperty({ type: () => DashboardKpiDto, description: 'Casas de Paz activas.' })
  activePeaceHouses!: DashboardKpiDto;

  @ApiProperty({
    type: () => DashboardKpiDto,
    description: 'Reuniones abiertas en la semana ISO en curso.',
  })
  meetingsThisWeek!: DashboardKpiDto;

  @ApiProperty({
    description: 'Qué abarcan las cifras según el rol: "Nacional", "Distrito", "Casa de Paz".',
  })
  scopeLabel!: string;
}

/** `GET /dashboard/trends` */
export class DashboardTrendsQueryDto {
  @ApiPropertyOptional({
    description: 'Cuántos meses hacia atrás, incluido el actual.',
    default: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months: number = 12;
}

/**
 * One month of both series.
 *
 * They travel together because the two charts on the dashboard cover the
 * SAME months: shipping them as two endpoints would let one arrive with a
 * different window than the other and put two charts side by side that
 * quietly disagree about what "Marzo" means.
 */
export class DashboardTrendPointDto {
  @ApiProperty({ description: 'Año calendario.' }) year!: number;
  @ApiProperty({ description: 'Mes, 1-12.' }) month!: number;
  @ApiProperty({ description: 'Etiqueta corta en español, p. ej. "Mar".' }) label!: string;
  @ApiProperty({ description: 'Asistencias registradas en el mes.' }) attendance!: number;
  @ApiProperty({ description: 'Ofrendas del mes, en COP.' }) offerings!: number;
}

export class DashboardTrendsDto {
  @ApiProperty({ type: () => [DashboardTrendPointDto] })
  months!: DashboardTrendPointDto[];
}

/**
 * A Casa de Paz as the map plots it.
 *
 * `count` is the size of its roster; the cluster badge counts MARKERS (that
 * is what leaflet.markercluster reports), so the map reads as "how many
 * Casas de Paz here" while each pin tells you how many people it gathers.
 */
export class MapPointDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Nombre de la Casa de Paz.' }) label!: string;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Municipio y departamento, para el popup.',
  })
  subLabel!: string | null;
  @ApiProperty({ description: 'Personas en la lista de la Casa de Paz.' }) count!: number;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;

  @ApiProperty({
    description:
      'TRUE cuando el punto es el centroide del municipio y no el pin propio de la casa. La pantalla debe distinguirlo: prometer precisión que no existe es peor que admitir la aproximación.',
  })
  approximate!: boolean;
}

export class MapStatsDto {
  @ApiProperty({ type: () => [MapPointDto] })
  points!: MapPointDto[];

  @ApiProperty({
    description:
      'Casas de Paz dentro del alcance que NO se pudieron ubicar: sin pin propio y con el municipio aún sin geocodificar.',
  })
  unlocated!: number;
}
