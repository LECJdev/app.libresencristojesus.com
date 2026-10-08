'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Church, Setting, UpdateChurchInput, UpsertSettingInput } from '@lcj/types';
import { fetchChurch, updateChurch } from '@/lib/api/organization';
import { deleteSetting, listSettings, upsertSetting } from '@/lib/api/settings';
import { organizationKeys } from './use-organization-tree';

export const churchKeys = {
  detail: [...organizationKeys.all, 'church'] as const,
  settings: ['settings'] as const,
};

export function useChurch(): UseQueryResult<Church | null, Error> {
  return useQuery({ queryKey: churchKeys.detail, queryFn: fetchChurch });
}

/**
 * Editing the Church invalidates the organigrama too: the tree carries the
 * church's name, logo and description at its root, so leaving it cached
 * would show a heading the user just changed.
 */
export function useUpdateChurch(): UseMutationResult<
  Church,
  Error,
  { id: string; input: UpdateChurchInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }) => updateChurch(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export function useSettings(): UseQueryResult<Setting[], Error> {
  return useQuery({ queryKey: churchKeys.settings, queryFn: listSettings });
}

export function useUpsertSetting(): UseMutationResult<
  Setting,
  Error,
  { key: string; input: UpsertSettingInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, input }) => upsertSetting(key, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: churchKeys.settings });
    },
  });
}

export function useDeleteSetting(): UseMutationResult<null, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSetting,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: churchKeys.settings });
    },
  });
}
