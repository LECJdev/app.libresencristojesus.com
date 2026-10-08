'use client';

import type { CardLeader } from '@lcj/ui';
import type { LeadershipSummary } from '@lcj/types';
import { useStoredFilePreview } from '@/hooks/use-file-upload';

/**
 * `GET /files/*path` requires a bearer token (see `useStoredFilePreview`),
 * so a `LeadershipMemberSummary.photo`/`AuthenticatedMember.photo` stored
 * path can never load as a plain `<img src>` — every card that shows a
 * leadership couple (Distritos, Casas de Paz, Líderes, Pastores de
 * Distrito, the organigrama) needs its photos resolved to object URLs
 * first.
 *
 * Always calls `useStoredFilePreview` exactly twice (leadership is modelled
 * as a couple, max 2 members) regardless of how many members actually
 * exist, so the hook count stays fixed across renders per React's rules.
 *
 * `firstNameOnly` — the Casa de Paz card has no room for full "Nombre
 * Apellido y Nombre Apellido" once both photos are already shown, so it
 * asks for just "Juan y Alejandra" instead.
 */
export function useResolvedCardLeaders(
  leadership: LeadershipSummary | null,
  firstNameOnly = false,
): CardLeader[] | undefined {
  const members = leadership?.members ?? [];
  const photo0 = useStoredFilePreview(members[0]?.photo ?? null);
  const photo1 = useStoredFilePreview(members[1]?.photo ?? null);

  if (members.length === 0) {
    return undefined;
  }

  const resolvedPhotos = [photo0, photo1];
  return members.map((member, index) => ({
    name: firstNameOnly ? member.firstName : `${member.firstName} ${member.lastName}`.trim(),
    photo: resolvedPhotos[index] ?? undefined,
  }));
}
