'use client';

import { useQuery } from '@tanstack/react-query';
import type { Role, RoleName } from '@lcj/types';
import { apiFetch } from '@/lib/http-client';

/**
 * Resolves a `RoleName` to the `CatRole.id` the API expects.
 *
 * The app reasons in the English enum; `POST /users` wants a UUID. The
 * catalog is read-only and effectively immutable, so it is cached for the
 * session and the translation costs one request per app load.
 *
 * Matched on `roleName`, never on the Spanish `name`: an accent-sensitive
 * comparison breaks the day an encoding differs anywhere along the way.
 */
export function useRoleId(role: RoleName): string | undefined {
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiFetch<Role[]>('/roles'),
    staleTime: Infinity,
  });

  return roles?.find((candidate) => candidate.roleName === role)?.id;
}
