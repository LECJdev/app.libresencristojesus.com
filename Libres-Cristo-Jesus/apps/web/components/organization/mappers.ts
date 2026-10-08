import type { CardLeader, EntityStatus } from '@lcj/ui';
import type { LeadershipSummary, LeadershipUnitStatus, RecordStatus } from '@lcj/types';

/**
 * Translations between the API's wire shapes and the Design System's
 * presentational props.
 *
 * They live here, not inside a component, because every organisational
 * screen needs the same two conversions — the organigrama, the district
 * list, the Casa de Paz list. Two slightly different versions of "how a
 * couple becomes avatars" is exactly the drift the Design System's
 * `LeadersRow` exists to prevent.
 */

/**
 * `RecordStatus` (two states, doc07) onto the badge union.
 *
 * The Design System's `EntityStatus` also carries 'suspended'/'closed',
 * which structural records never take — `LeadershipUnitStatus` is the
 * four-state enum, and it belongs to people, not to districts.
 */
export function toEntityStatus(status: RecordStatus): 'active' | 'inactive' {
  return status === 'ACTIVE' ? 'active' : 'inactive';
}

/**
 * `LeadershipUnitStatus` (four states, doc06 §3) onto the badge union.
 *
 * Unlike `toEntityStatus` above, this one *can* use the full `EntityStatus`
 * range: `LeadershipUnitStatus`'s four states line up 1:1 with it, and the
 * same colours the leadership screens already use — "Retirado" in the
 * "error" tone — are exactly `EntityStatusBadge`'s `closed`.
 */
const LEADERSHIP_TO_ENTITY_STATUS: Record<LeadershipUnitStatus, EntityStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  RETIRED: 'closed',
};

export function toLeadershipEntityStatus(status: LeadershipUnitStatus): EntityStatus {
  return LEADERSHIP_TO_ENTITY_STATUS[status];
}

/**
 * A Leadership Unit as the cards want it: one entry per member, because
 * `LeadersRow` renders the couple as overlapping avatars (doc06 §3 — the
 * system administers a unit, never a person).
 *
 * Returns `undefined` rather than `[]` for "no leadership": the card props
 * treat absence as "render nothing", and an empty array would still be a
 * defined value the card has to reason about.
 */
export function toCardLeaders(leadership: LeadershipSummary | null): CardLeader[] | undefined {
  if (!leadership || leadership.members.length === 0) {
    return undefined;
  }

  return leadership.members.map((member) => ({
    name: `${member.firstName} ${member.lastName}`.trim(),
    photo: member.photo ?? undefined,
  }));
}
