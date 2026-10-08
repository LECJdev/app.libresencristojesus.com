import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RecordStatus } from '@prisma/client';

/** `Person` sanitized for API responses (doc04 §5). */
export class PersonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true, type: String }) document!: string | null;
  @ApiProperty({ nullable: true, type: String }) gender!: string | null;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: Date }) birthDate!: Date | null;
  @ApiProperty({ nullable: true, type: String }) address!: string | null;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ nullable: true, type: String }) personStageId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, description: 'Nombre de la etapa.' })
  personStageName!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Casa de Paz actual — el período de historial cuyo endDate es null.',
  })
  currentPeaceHouseId!: string | null;

  @ApiProperty() status!: RecordStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty({ description: 'Optimistic locking counter.' }) version!: number;
}

/** One period of a person's membership in a Casa de Paz (doc04 §5). */
export class PersonHistoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() peaceHouseId!: string;
  @ApiProperty() peaceHouseName!: string;
  @ApiProperty() startDate!: Date;
  @ApiProperty({ nullable: true, type: Date, description: 'Null mientras es la casa actual.' })
  endDate!: Date | null;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
}

/**
 * One meeting of the person's Casa de Paz, since they joined it — exhaustive
 * by construction, same rule as the attendance checklist: a meeting with no
 * mark for this person is `present: false`, never omitted.
 */
export class PersonAttendanceRowDto {
  @ApiProperty({ description: 'YYYY-MM-DD.' }) meetingDate!: string;
  @ApiProperty() present!: boolean;
}

/** A roster member's attendance rate, for the Casa de Paz's people grid. */
export class PersonAttendanceRateDto {
  @ApiProperty() personId!: string;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Null cuando la Casa de Paz todavía no tiene reuniones.',
  })
  rate!: number | null;
}
