import type { Prisma } from '@prisma/client';
import { RoleName } from '@lcj/types';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * Row-level scope for a COLLECTION of Casas de Paz (doc05 Policies 1-2).
 *
 * THE COLLECTION COUNTERPART OF `ScopeGuard`. That guard resolves ONE
 * resource id out of the route params and decides whether the caller may
 * touch it. A list has no single id, so the narrowing has to happen inside
 * the `where` clause instead — filtering after the query would mean the rows
 * were already read, and that is the leak, not the fix.
 *
 * EXTRACTED WHEN THE THIRD CALLER APPEARED. `OfferingsService` and
 * `PeopleService` each grew their own copy; the dashboard would have been
 * the third, and three hand-written copies of an authorization rule is how
 * one of them quietly stops matching the other two. The rule now has one
 * definition, and it is the same one `ScopeGuard.isPeaceHouseInScope`
 * enforces for a single row.
 *
 * NOTE FOR CALLERS WHOSE ENTITY IS NOT A `PeaceHouse`: compose this, do not
 * reimplement it. A `Person` reaches its house through an open membership
 * period, so `PeopleService` nests this filter inside that relation rather
 * than replacing it.
 */
export function peaceHouseScopeFilter(actor: JwtPayload): Prisma.PeaceHouseWhereInput {
  // Administrador and Pastor General see the whole country: doc05 grants
  // them national reach, so an empty filter is the correct answer, not a
  // missing one.
  if (actor.role === RoleName.ADMIN || actor.role === RoleName.GENERAL_PASTOR) {
    return {};
  }

  // Policy 1: a Líder only ever reaches the Casas de Paz they lead.
  if (actor.role === RoleName.LEADER) {
    return { leadershipUnitId: actor.sub };
  }

  // Policy 2: a Pastor de Distrito reaches every Casa de Paz of their own
  // district — and no other. Falls closed: a pastor with no district
  // assigned matches nothing rather than everything.
  return { district: { leadershipUnitId: actor.sub } };
}

/**
 * A stable string describing WHAT the actor can see, for cache keys.
 *
 * Two callers with the same signature are entitled to byte-identical
 * results, so a cached aggregate may be shared between them. Keying a cache
 * by anything coarser — a single global entry, say — would serve one
 * district's totals to another district's pastor, which is a data leak
 * dressed up as a performance optimisation.
 */
export function peaceHouseScopeKey(actor: JwtPayload): string {
  if (actor.role === RoleName.ADMIN || actor.role === RoleName.GENERAL_PASTOR) {
    return 'national';
  }
  return `${actor.role}:${actor.sub}`;
}
