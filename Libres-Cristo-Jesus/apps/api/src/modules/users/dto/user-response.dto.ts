import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@lcj/types';
import type { LeadershipUnitStatus } from '@prisma/client';

/**
 * A single `LeadershipMember` sanitized for API responses. Same shape as
 * Auth's `AuthenticatedMemberDto` (`apps/api/src/modules/auth/dto/authenticated-user.dto.ts`)
 * — deliberately duplicated rather than imported, since Auth is a
 * finished/verified module this phase must not touch or depend on.
 */
export class UserMemberResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() gender!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ nullable: true, type: Date }) birthDate!: Date | null;
  @ApiProperty() username!: string;
  @ApiProperty() mustChangePassword!: boolean;
}

/**
 * `LeadershipUnit` sanitized for API responses — `passwordHash` is never
 * present on this shape at all, matching Auth's `AuthenticatedUserDto`
 * convention. `role` is the English `RoleName` enum (resolved from
 * `CatRole.name` via `ROLE_NAME_LABELS`, same translation `AuthService`
 * already performs), while `roleId` is kept too so clients can pre-fill an
 * edit form without a second lookup.
 */
export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty() roleId!: string;
  @ApiProperty({ enum: RoleName }) role!: RoleName;
  @ApiProperty() status!: LeadershipUnitStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true, type: String }) createdBy!: string | null;
  @ApiProperty({ nullable: true, type: String }) updatedBy!: string | null;
  @ApiProperty({ description: 'Optimistic locking counter.' }) version!: number;
  @ApiProperty({ type: [UserMemberResponseDto] }) members!: UserMemberResponseDto[];
}
