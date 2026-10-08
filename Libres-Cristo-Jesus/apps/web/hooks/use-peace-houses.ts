'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreatePeaceHouseInput,
  LeadershipHistoryEntry,
  PeaceHouse,
  UpdatePeaceHouseInput,
} from '@lcj/types';
import {
  createPeaceHouse,
  deletePeaceHouse,
  getPeaceHouseLeadershipHistory,
  listPeaceHouses,
  updatePeaceHouse,
  type ListPeaceHousesParams,
} from '@/lib/api/peace-houses';
import type { PaginatedResult } from '@/lib/http-client';
import { organizationKeys } from './use-organization-tree';

export const peaceHouseKeys = {
  all: ['peace-houses'] as const,
  list: (params: ListPeaceHousesParams) => [...peaceHouseKeys.all, 'list', params] as const,
  leadershipHistory: (id: string) => [...peaceHouseKeys.all, 'leadership-history', id] as const,
};

export function usePeaceHouses(
  params: ListPeaceHousesParams,
): UseQueryResult<PaginatedResult<PeaceHouse[]>, Error> {
  return useQuery({
    queryKey: peaceHouseKeys.list(params),
    queryFn: () => listPeaceHouses(params),
    placeholderData: (previous) => previous,
  });
}

/** Only fetched when a detail panel is actually open. */
export function usePeaceHouseLeadershipHistory(
  id: string | undefined,
): UseQueryResult<LeadershipHistoryEntry[], Error> {
  return useQuery({
    queryKey: peaceHouseKeys.leadershipHistory(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getPeaceHouseLeadershipHistory(id!),
  });
}

/**
 * Invalidates everything a Casa de Paz write touches.
 *
 * The leadership history is included because an update MAY have closed one
 * period and opened another; the organigrama because it embeds the house's
 * name, schedule, location and leaders.
 */
function useInvalidatePeaceHouses(): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: peaceHouseKeys.all }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
    ]);
  };
}

export function useCreatePeaceHouse(): UseMutationResult<PeaceHouse, Error, CreatePeaceHouseInput> {
  const invalidate = useInvalidatePeaceHouses();
  return useMutation({ mutationFn: createPeaceHouse, onSuccess: invalidate });
}

export function useUpdatePeaceHouse(): UseMutationResult<
  PeaceHouse,
  Error,
  { id: string; input: UpdatePeaceHouseInput }
> {
  const invalidate = useInvalidatePeaceHouses();
  return useMutation({
    mutationFn: ({ id, input }) => updatePeaceHouse(id, input),
    onSuccess: invalidate,
  });
}

export function useDeletePeaceHouse(): UseMutationResult<null, Error, string> {
  const invalidate = useInvalidatePeaceHouses();
  return useMutation({ mutationFn: deletePeaceHouse, onSuccess: invalidate });
}
