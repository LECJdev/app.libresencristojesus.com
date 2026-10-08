'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { LeadershipUnit, RoleName } from '@lcj/types';
import { listUsers, type ListUsersParams } from '@/lib/api/users';
import type { PaginatedResult } from '@/lib/http-client';
import { useRoleId } from './use-role-id';

/**
 * Paginated listing of Leadership Units filtered by role.
 *
 * Distinct from `useLeadershipUnitsByRole`, which fetches an unpaginated
 * page to fill a `<select>`: this one backs a real table with search,
 * sorting and paging, and must not silently cap at 100 rows.
 */
export const leadershipListKeys = {
  all: ['leadership-units'] as const,
  list: (role: RoleName, params: ListUsersParams) =>
    [...leadershipListKeys.all, 'list', role, params] as const,
};

export function useLeadershipList(
  role: RoleName,
  params: Omit<ListUsersParams, 'roleId'>,
): UseQueryResult<PaginatedResult<LeadershipUnit[]>, Error> {
  const roleId = useRoleId(role);

  return useQuery({
    queryKey: leadershipListKeys.list(role, { ...params, roleId }),
    // Gated on the role id: firing without it would list every user
    // regardless of role, which is not what any caller means.
    enabled: Boolean(roleId),
    queryFn: () => listUsers({ ...params, roleId }),
    placeholderData: (previous) => previous,
  });
}
