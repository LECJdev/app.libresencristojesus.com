'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PeaceHouse } from '@lcj/types';
import { getPeaceHouse } from '@/lib/api/peace-houses';
import { peaceHouseKeys } from '@/hooks/use-peace-houses';

/**
 * Loads the FULL `PeaceHouse` record on demand, for the moment a Casa de
 * Paz card in the organigrama is opened.
 *
 * `PeaceHouseDetailDrawer` (reused as-is) expects a full `PeaceHouse` —
 * address, coordinates, ids — none of which the tree's lighter
 * `PeaceHouseNode` carries. This is a thin `useQuery` wrapper around the
 * already-existing `getPeaceHouse(id)` endpoint function and the
 * already-exported `peaceHouseKeys` query-key builder; it does not touch
 * `apps/web/hooks/**`, only imports what those files already export.
 */
export function usePeaceHouseDetail(id: string | null): UseQueryResult<PeaceHouse, Error> {
  return useQuery({
    queryKey: [...peaceHouseKeys.all, 'detail', id ?? ''],
    queryFn: () => getPeaceHouse(id as string),
    enabled: id !== null,
  });
}
