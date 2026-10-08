import { ApiProperty } from '@nestjs/swagger';

/** Un punto del sparkline de asistencia — una reunión semanal pasada. */
export class KidsAttendanceTrendPointDto {
  @ApiProperty({ description: 'Año ISO — no el año calendario.' }) isoYear!: number;
  @ApiProperty() isoWeek!: number;
  @ApiProperty({ description: 'Etiqueta corta, p. ej. "Sem 34".' }) label!: string;
  @ApiProperty({ description: 'Porcentaje de asistencia de esa reunión.' }) attendancePercent!: number;
}

/** `GET /kids/schools/:schoolId/metrics` — indicadores del dashboard de una sede. */
export class KidsSchoolMetricsResponseDto {
  @ApiProperty() kidsSchoolId!: string;
  @ApiProperty({ description: 'Niños activos de la sede.' }) totalChildren!: number;
  @ApiProperty({
    description: 'Presentes en la reunión de la semana ISO vigente (0 si aún no se abrió).',
  })
  present!: number;
  @ApiProperty({ description: 'Ausentes en la reunión de la semana ISO vigente.' }) absent!: number;
  @ApiProperty({
    description: 'Promedio de asistencia (%) de las últimas reuniones existentes.',
  })
  averageAttendance!: number;
  @ApiProperty({ description: 'Niños con autorización PENDING_AUTHORIZATION.' })
  pendingConsents!: number;
  @ApiProperty({ description: 'Niños registrados en los últimos 30 días.' }) newChildren!: number;
  @ApiProperty({ description: 'Niños con status INACTIVE.' }) inactiveChildren!: number;
  @ApiProperty({ type: () => [KidsAttendanceTrendPointDto] })
  attendanceTrend!: KidsAttendanceTrendPointDto[];
}
