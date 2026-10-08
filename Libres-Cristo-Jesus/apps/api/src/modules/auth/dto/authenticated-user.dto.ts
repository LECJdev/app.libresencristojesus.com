import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@lcj/types';
import type { LeadershipUnitStatus } from '@prisma/client';

/**
 * A single `LeadershipMember` attached to the authenticated
 * `LeadershipUnit`, sanitized for API responses. Never includes anything
 * from `LeadershipUnit` itself (`passwordHash` above all).
 */
export class AuthenticatedMemberDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() gender!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ nullable: true, type: Date }) birthDate!: Date | null;
}

/**
 * The `user` payload returned by `POST /auth/login` and `GET /auth/me`.
 * doc19 section 2 originally showed `{ accessToken, refreshToken, user:
 * {} }`, but the refresh token no longer travels in any JSON body — it is
 * set as an httpOnly cookie by the controller instead (architecture
 * decision: never expose it to client-side JS) — so `LoginResponseDto`/
 * `RefreshResponseDto` below deliberately omit it. `passwordHash` is, as
 * before, never present on this shape at all (not merely omitted at
 * serialization time).
 */
export class AuthenticatedUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ nullable: true, type: String }) photo!: string | null;
  @ApiProperty({ enum: RoleName }) role!: RoleName;
  @ApiProperty() status!: LeadershipUnitStatus;
  @ApiProperty({ type: [AuthenticatedMemberDto] }) members!: AuthenticatedMemberDto[];
}

export class LoginResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: AuthenticatedUserDto }) user!: AuthenticatedUserDto;
}

export class RefreshResponseDto {
  @ApiProperty() accessToken!: string;
}
