import type { RoleName } from '@lcj/types';

/**
 * Shape of the JWT payload signed/verified by `TokenService`. This is
 * this app's own internal contract (not part of the DB schema): `role`
 * is the English `RoleName` enum value, decoupled from the Spanish
 * `CatRole.name` string stored in the DB — `AuthService.login` is what
 * translates one into the other when it first signs a token.
 *
 * `sub` is the `LeadershipUnit.id` — scope/ownership (District/Casa de
 * Paz) still points at the Unit, and 29+ files key off `sub` for that,
 * so its meaning did not change.
 *
 * `memberId` is the `LeadershipMember.id` that actually authenticated
 * (each member now has an independent `username`/`passwordHash` —
 * `prisma/schema.prisma` `LeadershipMember`). It identifies which
 * member's `UserSession` row to look up/rotate/delete in
 * `refresh`/`logout`, since sessions are scoped per member, not per
 * unit.
 */
export interface JwtPayload {
  sub: string;
  memberId: string;
  username: string;
  role: RoleName;
}
