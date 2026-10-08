import type { RoleName } from './role';

/**
 * Mirrors the Prisma `LeadershipUnitStatus` enum (`prisma/schema.prisma`).
 * Repeated here as a plain string union — rather than importing
 * `@prisma/client` — because this package is consumed by `apps/web`, which
 * must never pull in Prisma's generated client (backend-only, heavy, and
 * requires a DB connection to generate).
 */
export type LeadershipUnitStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RETIRED';

/**
 * Plain, backend/frontend-agnostic mirror of
 * `apps/api/src/modules/auth/dto/authenticated-user.dto.ts`'s
 * `AuthenticatedMemberDto`. Kept here instead of importing the Nest DTO
 * directly because that class carries `@nestjs/swagger` decorators and a
 * `@prisma/client` type import — both backend-only dependencies `apps/web`
 * must not take on. `birthDate` is `string | null` (not `Date`) because
 * this shape describes the JSON payload actually received over the wire
 * by `GET /auth/me` / `POST /auth/login`, not the in-process backend type.
 */
export interface AuthenticatedMember {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  birthDate: string | null;
}

/**
 * Plain mirror of `AuthenticatedUserDto` — the `user` payload returned by
 * `POST /auth/login` and `GET /auth/me`. See `AuthenticatedMember` above
 * for why this isn't imported straight from `apps/api`.
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  type: string;
  photo: string | null;
  role: RoleName;
  status: LeadershipUnitStatus;
  members: AuthenticatedMember[];
}
