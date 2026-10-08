import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** A member of the couple that held the appointment. */
export class LeadershipHistoryMemberDto {
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
}

/**
 * One period in a Casa de Paz's leadership history (doc06 §10/§14).
 *
 * The open period is the one with `endDate === null`; every other row is
 * closed. The couple's names are embedded rather than referenced by id
 * because this is a historical record: if the Leadership Unit is later
 * renamed or deactivated, the timeline must still read the way it did when
 * it happened.
 */
export class LeadershipHistoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() leadershipUnitId!: string;
  @ApiProperty({ type: [LeadershipHistoryMemberDto] }) members!: LeadershipHistoryMemberDto[];
  @ApiProperty() startDate!: Date;
  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description: 'Null while this is the current leadership.',
  })
  endDate!: Date | null;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'LeadershipUnit id of whoever recorded the change (doc06 §20 auditoría).',
  })
  createdBy!: string | null;
  @ApiProperty() createdAt!: Date;
}
