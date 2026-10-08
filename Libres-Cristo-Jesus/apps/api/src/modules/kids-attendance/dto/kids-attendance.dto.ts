import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

/** `PATCH /kids/meetings/:meetingId/children/:childId` */
export class MarkKidsAttendanceDto {
  @ApiProperty({ description: 'true = presente, false = ausente.' })
  @IsBoolean()
  present!: boolean;
}

/**
 * `POST /kids/meetings/:meetingId/mark-all` y `.../unmark-all`.
 *
 * Dos endpoints, no uno con `present: boolean` como en Casas de Paz — así lo
 * aprobó el usuario en la sección 18 del diseño. `childIds` es opcional en
 * ambos: si se omite, aplica a todo el roster de la reunión.
 */
export class MarkAllKidsDto {
  @ApiPropertyOptional({
    description: 'Limita la operación a estos niños. Omitir para aplicar a todo el roster.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  childIds?: string[];
}

/** Una fila del checklist de asistencia. */
export class KidsChecklistRowDto {
  @ApiProperty() childId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ description: 'false mientras nadie lo haya marcado.' }) present!: boolean;
}

/** La lista de asistencia completa de una reunión semanal de Escuela Kids. */
export class KidsChecklistResponseDto {
  @ApiProperty() meetingId!: string;
  @ApiProperty() kidsSchoolId!: string;
  @ApiProperty() meetingDate!: Date;
  @ApiProperty({ description: 'Año ISO — no el año calendario.' }) isoYear!: number;
  @ApiProperty() isoWeek!: number;
  @ApiProperty({ type: () => [KidsChecklistRowDto] }) rows!: KidsChecklistRowDto[];
  @ApiProperty({ description: 'Cuántos niños figuran como presentes.' }) presentCount!: number;
}
