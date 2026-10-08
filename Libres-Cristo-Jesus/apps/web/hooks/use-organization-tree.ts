'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { OrganizationTree } from '@lcj/types';
import { fetchOrganizationTree } from '@/lib/api/organization';

/**
 * Query keys for the Organización module, in one place so a mutation can
 * invalidate exactly what it changed instead of guessing at a string.
 */
export const organizationKeys = {
  all: ['organization'] as const,
  tree: () => [...organizationKeys.all, 'tree'] as const,
};

/**
 * The organigrama.
 *
 * `staleTime` is deliberately non-zero: the organisational structure
 * changes when a pastor is reassigned or a Casa de Paz opens — events
 * measured in weeks, not seconds. Refetching it on every window focus
 * would spend a request (and a spinner) on data that is almost never
 * different.
 */
export function useOrganizationTree(): UseQueryResult<OrganizationTree, Error> {
  return useQuery({
    queryKey: organizationKeys.tree(),
    queryFn: fetchOrganizationTree,
    staleTime: 5 * 60 * 1000,
  });
}
