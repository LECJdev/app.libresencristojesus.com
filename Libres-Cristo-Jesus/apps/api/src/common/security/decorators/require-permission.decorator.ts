import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

/**
 * Which kind of scoped resource a route's `:id`-shaped param refers to,
 * for the scope half of `ScopeGuard`'s check (doc05 "Policies"). Only the
 * two resource kinds doc05 actually scopes a role to are modeled here —
 * `LEADER` never has district-level access at all, so there is no
 * "leadershipUnit" scope kind to add.
 */
export enum ScopeResourceType {
  /** A `PeaceHouse` row (doc05 Policy 1: a Líder's own Casa de Paz). */
  PEACE_HOUSE = 'peaceHouse',
  /** A `District` row (doc05 Policy 2: a Pastor de Distrito's own District). */
  DISTRICT = 'district',
  /**
   * A `Person` row. Scoped INDIRECTLY, through the Casa de Paz the person
   * currently belongs to — a person has no leader of their own, so
   * ownership is inherited from their open `PersonPeaceHouseHistory`
   * period.
   */
  PERSON = 'person',
  /**
   * A `Meeting` row, and by extension everything hanging off it: the
   * attendance sheet, the report, the offering and the photographs.
   *
   * Scoped INDIRECTLY through `MeetingSchedule.peaceHouseId`, exactly like
   * `PERSON`. It exists because every route past "open the week" takes a
   * `meetingId` instead of a `peaceHouseId`, and a route whose only
   * identifier the guard cannot resolve is a route with no row-level check
   * at all — which is how an authenticated Líder could write on any Casa de
   * Paz in the country.
   */
  MEETING = 'meeting',
  /**
   * A `KidsSchool` row (Escuela Kids — independent module, see
   * `prisma/schema.prisma`'s "Escuela Kids" section). Unlike every other
   * kind here, ownership is NOT a single `leadershipUnitId` FK: a school
   * has one active `KIDS_LEADER` and any number of `KIDS_ASSISTANT`s, so
   * `ScopeGuard` resolves this one through `KidsUserAssignment` — the
   * first many-to-many ownership case in the system.
   */
  KIDS_SCHOOL = 'kidsSchool',
  /**
   * A `KidsChild` row. Scoped INDIRECTLY through `KidsChild.kidsSchoolId` —
   * same pattern as `MEETING`/`PERSON`: the route's `:id` names the child,
   * not the school, so this resolves the school first and then delegates to
   * the same `KIDS_SCHOOL` check.
   */
  KIDS_CHILD = 'kidsChild',
  /**
   * A `KidsGuardian` row. A guardian has no `kidsSchoolId` of its own — it
   * is linked to N children (possibly across different schools, e.g. one
   * guardian with kids at both Norte and Sur) via `KidsChildGuardian`. In
   * scope when the actor has scope over AT LEAST ONE linked child's school.
   */
  KIDS_GUARDIAN = 'kidsGuardian',
  /**
   * A `KidsMeeting` row, and by extension its attendance sheet. Scoped
   * INDIRECTLY through `KidsMeeting.kidsSchoolId` — same reason `MEETING`
   * exists: every route past "open the week" takes a `meetingId` instead of
   * a `schoolId`.
   */
  KIDS_MEETING = 'kidsMeeting',
}

export interface RequirePermissionOptions {
  /**
   * Declares which entity kind the route's resource-id param identifies,
   * so `ScopeGuard` knows how to resolve ownership. Omit for routes with
   * no single target resource (e.g. a list/create endpoint) — the
   * permission check (a) still applies, but no scope check (b) runs.
   */
  scopeType?: ScopeResourceType;
  /** Route param name carrying the target resource id. Defaults to `id`. */
  paramName?: string;
}

export interface RequirePermissionMetadata extends RequirePermissionOptions {
  resource: string;
  action: string;
}

/**
 * Declares the `(resource, action)` permission a route requires, e.g.
 * `@RequirePermission('district', 'create')`, and optionally which kind
 * of resource its `:id` param identifies for scope checking, e.g.
 * `@RequirePermission('peaceHouse', 'update', { scopeType: ScopeResourceType.PEACE_HOUSE })`.
 *
 * Read by `ScopeGuard`, which implements both halves of doc05's
 * "Rol -> Permisos -> Policies" model: (a) does the authenticated user's
 * role have this permission at all (via `RolePermission`), and (b), for
 * routes that target a single scoped resource, does that resource fall
 * within the user's scope (own Casa de Paz for LEADER, own District +
 * its Casas de Paz for DISTRICT_PASTOR, unrestricted for
 * GENERAL_PASTOR/ADMIN).
 *
 * A route with no `@RequirePermission(...)` at all is allowed through by
 * `ScopeGuard` unconditionally — like `@Roles(...)`/`RolesGuard`, this
 * decorator only narrows access, it never grants it on its own.
 */
export const RequirePermission = (
  resource: string,
  action: string,
  options: RequirePermissionOptions = {},
): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRE_PERMISSION_KEY, {
    resource,
    action,
    ...options,
  } satisfies RequirePermissionMetadata);
