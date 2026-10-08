import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadershipUnitStatus, RecordStatus } from '@prisma/client';

/**
 * Response shape of `GET /organization/tree` — the Organigrama
 * (doc06 §2 "Jerarquía Oficial", §4 "Organigrama", §7 "Árbol Jerárquico").
 *
 * The whole hierarchy is returned in ONE response rather than a node
 * endpoint the client walks. doc06 §7 wants a tree the user expands and
 * collapses freely; doing that over the network would put a request
 * between the user and every triangle they click. The payload stays small
 * because it carries only what the cards in doc06 §8 display — never the
 * full records.
 */

/**
 * A Leadership Unit as the organigrama shows it (doc06 §3): the couple,
 * not a person. Both members are included because doc06 §8's card shows
 * both names and both photos.
 */
export class LeadershipSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Role name, e.g. "Pastor Distrito".' }) role!: string;
  @ApiProperty({ enum: LeadershipUnitStatus }) status!: LeadershipUnitStatus;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ type: () => [LeadershipMemberSummaryDto] }) members!: LeadershipMemberSummaryDto[];
}

export class LeadershipMemberSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() gender!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
}

export class PeaceHouseNodeDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) code!: string | null;
  @ApiProperty({ enum: RecordStatus }) status!: RecordStatus;
  @ApiProperty({ nullable: true, type: String }) departmentName!: string | null;
  @ApiProperty({ nullable: true, type: String }) municipalityName!: string | null;
  @ApiProperty({ nullable: true, type: String }) neighborhood!: string | null;
  @ApiProperty({ nullable: true, type: String }) meetingDay!: string | null;
  @ApiProperty({ nullable: true, type: String }) meetingHour!: string | null;
  @ApiPropertyOptional({ type: () => LeadershipSummaryDto, nullable: true })
  leadership!: LeadershipSummaryDto | null;
}

export class DistrictNodeDto {
  @ApiProperty() id!: string;
  @ApiProperty() number!: number;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ enum: RecordStatus }) status!: RecordStatus;
  @ApiPropertyOptional({ type: () => LeadershipSummaryDto, nullable: true })
  leadership!: LeadershipSummaryDto | null;
  @ApiProperty({ description: 'Active Casas de Paz in this district (doc06 §8).' })
  peaceHouseCount!: number;
  @ApiProperty({ type: () => [PeaceHouseNodeDto] }) peaceHouses!: PeaceHouseNodeDto[];
}

/** The four summary cards of doc06 §6. */
export class OrganizationSummaryDto {
  @ApiProperty() districts!: number;
  @ApiProperty() peaceHouses!: number;
  @ApiProperty({ description: 'Distinct Leadership Units holding a district or a Casa de Paz.' })
  leaderships!: number;
  @ApiProperty({
    description: 'Distinct municipalities with at least one Casa de Paz ("Cobertura Nacional").',
  })
  municipalities!: number;
}

export class OrganizationTreeDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) logo!: string | null;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty({ enum: RecordStatus }) status!: RecordStatus;
  @ApiPropertyOptional({
    type: () => [LeadershipSummaryDto],
    description: 'Leadership Units holding the "Pastor General" role (doc06 §2).',
  })
  generalPastors!: LeadershipSummaryDto[];
  @ApiProperty({ type: () => OrganizationSummaryDto }) summary!: OrganizationSummaryDto;
  @ApiProperty({ type: () => [DistrictNodeDto] }) districts!: DistrictNodeDto[];
  @ApiProperty({
    description:
      "True when the tree was narrowed to the caller's own scope (Pastor de Distrito, Líder).",
  })
  scoped!: boolean;
}
