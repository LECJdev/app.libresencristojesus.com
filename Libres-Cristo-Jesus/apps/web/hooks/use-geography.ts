'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Department, Municipality } from '@lcj/types';
import { listDepartments, listMunicipalities } from '@/lib/api/geography';

/**
 * Geographic catalogs.
 *
 * `staleTime: Infinity` is correct here, not a shortcut: these tables are
 * written once by the installer and by nothing else (doc04 §3), so a
 * refetch could never return anything different within a session.
 */
export const geographyKeys = {
  departments: ['geography', 'departments'] as const,
  municipalities: (departmentId: string | undefined) =>
    ['geography', 'municipalities', departmentId] as const,
};

export function useDepartments(): UseQueryResult<Department[], Error> {
  return useQuery({
    queryKey: geographyKeys.departments,
    queryFn: listDepartments,
    staleTime: Infinity,
  });
}

/**
 * Municipalities of one department. Idle until a department is chosen —
 * the API requires the filter, and firing without it would ask for all
 * 1,123.
 */
export function useMunicipalities(
  departmentId: string | undefined,
): UseQueryResult<Municipality[], Error> {
  return useQuery({
    queryKey: geographyKeys.municipalities(departmentId),
    enabled: Boolean(departmentId),
    queryFn: () => listMunicipalities(departmentId!),
    staleTime: Infinity,
  });
}
