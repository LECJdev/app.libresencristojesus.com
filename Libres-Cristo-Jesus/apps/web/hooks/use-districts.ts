'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { CreateDistrictInput, District, UpdateDistrictInput } from '@lcj/types';
import {
  createDistrict,
  deleteDistrict,
  listDistricts,
  updateDistrict,
  type ListDistrictsParams,
} from '@/lib/api/districts';
import type { PaginatedResult } from '@/lib/http-client';
import { organizationKeys } from './use-organization-tree';

export const districtKeys = {
  all: ['districts'] as const,
  list: (params: ListDistrictsParams) => [...districtKeys.all, 'list', params] as const,
};

export function useDistricts(
  params: ListDistrictsParams,
): UseQueryResult<PaginatedResult<District[]>, Error> {
  return useQuery({
    queryKey: districtKeys.list(params),
    queryFn: () => listDistricts(params),
    // Keeps the previous page on screen while the next one loads, so
    // paging doesn't collapse the table to a skeleton and back.
    placeholderData: (previous) => previous,
  });
}

/**
 * Invalidates everything a district write can affect.
 *
 * The organigrama is included on purpose: it embeds district names,
 * leadership and counts, so leaving it cached would show a tree that
 * contradicts the list the user is looking at.
 */
function useInvalidateDistricts(): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: districtKeys.all }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
    ]);
  };
}

export function useCreateDistrict(): UseMutationResult<District, Error, CreateDistrictInput> {
  const invalidate = useInvalidateDistricts();
  return useMutation({ mutationFn: createDistrict, onSuccess: invalidate });
}

export function useUpdateDistrict(): UseMutationResult<
  District,
  Error,
  { id: string; input: UpdateDistrictInput }
> {
  const invalidate = useInvalidateDistricts();
  return useMutation({
    mutationFn: ({ id, input }) => updateDistrict(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteDistrict(): UseMutationResult<null, Error, string> {
  const invalidate = useInvalidateDistricts();
  return useMutation({ mutationFn: deleteDistrict, onSuccess: invalidate });
}
