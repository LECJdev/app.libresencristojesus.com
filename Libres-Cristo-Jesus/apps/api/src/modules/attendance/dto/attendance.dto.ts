import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { MeetingStatus } from '@prisma/client';

/** `PATCH /attendance/meetings/:meetingId/people/:personId` */
export class MarkAttendanceDto {
  @ApiProperty({ description: 'true = presente, false = ausente.' })
  @IsBoolean()
  present!: boolean;

  @ApiPropertyOptional({ description: 'Observación de esta asistencia.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comments?: string;
}

/**
 * `POST /attendance/meetings/:meetingId/mark-all`
 *
 * One endpoint for both "marcar todos" and "desmarcar todos": they are the
 * same operation with a different value, and two endpoints would duplicate
 * the lock check and the audit entry.
 */
export class MarkAllDto {
  @ApiProperty({ description: 'true = marcar todos presentes, false = desmarcar todos.' })
  @IsBoolean()
  present!: boolean;

  @ApiPropertyOptional({
    description: 'Limita la operación a estas personas. Omitir para aplicar a toda la lista.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  personIds?: string[];
}

/** `POST /attendance/meetings/:meetingId/unlock` (doc11 RN-407). */
export class UnlockMeetingDto {
  @ApiProperty({ description: 'Motivo del desbloqueo. Obligatorio para la trazabilidad.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

/** One row of the weekly checklist. */
export class ChecklistRowDto {
  @ApiProperty() personId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ description: 'false mientras nadie la haya marcado.' }) present!: boolean;
  @ApiProperty({ nullable: true, type: String }) comments!: string | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Etapa del proceso pastoral, para dar contexto al líder.',
  })
  personStageName!: string | null;
}

/** Why the sheet is (or is not) editable — mirrors `LockState`. */
export class LockStateDto {
  @ApiProperty() editable!: boolean;
  @ApiProperty({
    enum: ['current-week', 'role-exempt', 'unlocked', 'past-week'],
    description:
      'current-week: semana vigente · role-exempt: rol no sujeto al bloqueo · unlocked: desbloqueo vigente · past-week: bloqueada.',
  })
  reason!: string;
  @ApiProperty({ nullable: true, type: Date }) editableUntil!: Date | null;
  @ApiProperty({ nullable: true, type: Date }) unlockedUntil!: Date | null;
}

/** The whole weekly attendance sheet. */
export class ChecklistResponseDto {
  @ApiProperty() meetingId!: string;
  @ApiProperty() peaceHouseId!: string;
  @ApiProperty() meetingDate!: Date;
  @ApiProperty({ description: 'Año ISO — no el año calendario.' }) isoYear!: number;
  @ApiProperty() isoWeek!: number;
  @ApiProperty() status!: MeetingStatus;
  @ApiProperty({ type: () => LockStateDto }) lock!: LockStateDto;
  @ApiProperty({ type: () => [ChecklistRowDto] }) rows!: ChecklistRowDto[];
  @ApiProperty({ description: 'Cuántas personas figuran como presentes.' }) presentCount!: number;
}
