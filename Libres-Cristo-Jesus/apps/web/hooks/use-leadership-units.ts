'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ROLE_NAME_LABELS, type LeadershipUnit, type Role, type RoleName } from '@lcj/types';
import { apiFetch, apiFetchPaginated } from '@/lib/http-client';

/**
 * Leadership Units available to lead a District or a Casa de Paz.
 *
 * WHY TWO REQUESTS
 * `GET /users` filters by `roleId` (a UUID), while the app reasons in
 * `RoleName` — so the role catalog is fetched first to translate. The
 * alternative, pulling every user and filtering in the browser, would ship
 * the whole leadership table to the client and break the moment the list
 * outgrows one page.
 *
 * The catalog is effectively immutable (`GET /roles` is read-only by
 * design), so it is cached for the session and the translation costs one
 * request per app load, not per form.
 */

const rolesKey = ['roles'] as const;

function useRoles(): UseQueryResult<Role[], Error> {
  return useQuery({
    queryKey: rolesKey,
    queryFn: () => apiFetch<Role[]>('/roles'),
    staleTime: Infinity,
  });
}

export function useLeadershipUnitsByRole(role: RoleName): UseQueryResult<LeadershipUnit[], Error> {
  const { data: roles } = useRoles();
  // Matched on `roleName` (the English enum the API resolves server-side),
  // not on the Spanish `name`: an accent-sensitive string comparison makes
  // this break the day an encoding differs anywhere along the way.
  const roleId = roles?.find((candidate) => candidate.roleName === role)?.id;

  return useQuery({
    queryKey: ['leadership-units', role, roleId] as const,
    // `enabled` gates on the id, so this never fires a request with
    // `roleId=undefined` — which the API would answer with every user.
    enabled: Boolean(roleId),
    queryFn: async () => {
      const { data } = await apiFetchPaginated<LeadershipUnit[]>(
        `/users?roleId=${roleId!}&pageSize=100&sort=createdAt&order=asc`,
      );
      return data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Label for a unit in a selector: the couple, disambiguated by the first
 * member's account username, falling back to the role when no member has
 * been registered yet.
 */
export function leadershipUnitLabel(unit: LeadershipUnit): string {
  if (unit.members.length === 0) {
    return ROLE_NAME_LABELS[unit.role];
  }
  const names = unit.members
    .map((member) => `${member.firstName} ${member.lastName}`.trim())
    .join(' y ');
  return `${names} (${unit.members[0]!.username})`;
}
