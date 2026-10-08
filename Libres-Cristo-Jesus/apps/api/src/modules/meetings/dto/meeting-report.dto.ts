import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { MeetingStatus } from '@prisma/client';
import { LockStateDto } from '../../attendance/dto/attendance.dto';

/**
 * `PATCH /meetings/:meetingId/report` — tema, predicador y observaciones
 * (doc01 RF-022/RF-023/RF-024).
 *
 * Every field is optional because the report is filled in over the course
 * of the week, not in one sitting: the theme before the meeting, the
 * preacher during it, the notes afterwards.
 */
export class UpdateMeetingReportDto {
  @ApiPropertyOptional({ description: 'Tema del catálogo. null lo desvincula.' })
  @IsOptional()
  @IsUUID()
  themeId?: string | null;

  @ApiPropertyOptional({ description: 'Quién predicó. Texto libre: predican invitados.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preacher?: string;

  @ApiPropertyOptional({ description: 'Observaciones de la reunión.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/**
 * `PUT /meetings/:meetingId/offering` (doc02 RN-039..RN-042).
 *
 * A PUT and not a POST: RN-039 allows exactly one offering per meeting, so
 * registering and correcting are the same act on the same resource. A POST
 * would invite a second row the unique constraint would then reject.
 */
export class UpsertOfferingDto {
  @ApiProperty({ description: 'Valor en COP. Nunca negativo (RN-041).', example: 250000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: 'Observaciones de la ofrenda.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** `POST /meetings/:meetingId/photos` (doc01 RF-025, doc02 RN-043). */
export class AddMeetingPhotoDto {
  @ApiProperty({
    description: 'Ruta devuelta por POST /files/upload. Nunca el binario (doc04 §15).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  path!: string;

  @ApiPropertyOptional({ description: 'Pie de foto.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiPropertyOptional({ description: 'Orden dentro de la galería.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * `PATCH /meetings/:meetingId/photos/:photoId`
 *
 * `hidden` is how RN-044 is honoured: a photograph is never destroyed, only
 * taken out of the gallery. Setting it back to false restores it.
 */
export class UpdateMeetingPhotoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'true la oculta de la galería, false la restituye.' })
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}

export class OfferingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() meetingId!: string;
  @ApiProperty({ description: 'Valor en COP.' }) amount!: number;
  @ApiProperty({ example: 'COP' }) currency!: string;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ nullable: true, type: String }) registeredBy!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class MeetingPhotoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Ruta almacenada; el binario se sirve por GET /files/*path.' })
  path!: string;
  @ApiProperty({ nullable: true, type: String }) caption!: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ description: 'Oculta de la galería (RN-044), nunca eliminada.' })
  hidden!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() version!: number;
}

/** Everything the "Reunión" screen needs, in one response. */
export class MeetingReportResponseDto {
  @ApiProperty() meetingId!: string;
  @ApiProperty() peaceHouseId!: string;
  @ApiProperty() peaceHouseName!: string;
  @ApiProperty() meetingDate!: Date;
  @ApiProperty({ description: 'Año ISO — no el año calendario.' }) isoYear!: number;
  @ApiProperty() isoWeek!: number;
  @ApiProperty() status!: MeetingStatus;

  @ApiProperty({ nullable: true, type: String }) themeId!: string | null;
  @ApiProperty({ nullable: true, type: String }) themeTitle!: string | null;
  @ApiProperty({ nullable: true, type: String }) themeSeries!: string | null;
  @ApiProperty({ nullable: true, type: String }) preacher!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;

  @ApiProperty({ nullable: true, type: () => OfferingResponseDto })
  offering!: OfferingResponseDto | null;
  @ApiProperty({ type: () => [MeetingPhotoResponseDto] })
  photos!: MeetingPhotoResponseDto[];

  @ApiProperty({
    type: () => LockStateDto,
    description: 'El MISMO candado de la asistencia. Una reunión, una regla.',
  })
  lock!: LockStateDto;

  @ApiProperty({ description: 'Personas marcadas como presentes.' }) presentCount!: number;
  @ApiProperty({ description: 'Personas en la lista de la Casa de Paz.' }) rosterCount!: number;
}
