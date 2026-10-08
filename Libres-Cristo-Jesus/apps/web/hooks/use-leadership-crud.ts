'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type {
  CreateLeadershipUnitInput,
  LeadershipUnit,
  UpdateLeadershipUnitInput,
} from '@lcj/types';
import {
  changePassword,
  createUser,
  deleteUser,
  updateUser,
  type ChangePasswordInput,
} from '@/lib/api/users';
import { organizationKeys } from './use-organization-tree';

/**
 * Write operations over `LeadershipUnit`, shared by every screen that
 * administers a couple's account — Pastores Generales, Pastores de
 * Distrito, Líderes.
 *
 * One set of mutations rather than one per role: the endpoint, the
 * optimistic-locking contract and the cache invalidation are identical,
 * and three copies would drift.
 */

/**
 * Invalidates everything a leadership write can affect.
 *
 * The organigrama is included because it embeds names, photos and roles;
 * the leadership-unit selectors because a new Líder must appear in the
 * Casa de Paz form without a reload.
 */
function useInvalidateLeadership(): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['leadership-units'] }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
    ]);
  };
}

export function useCreateLeadershipUnit(): UseMutationResult<
  LeadershipUnit,
  Error,
  CreateLeadershipUnitInput
> {
  const invalidate = useInvalidateLeadership();
  return useMutation({ mutationFn: createUser, onSuccess: invalidate });
}

export function useUpdateLeadershipUnit(): UseMutationResult<
  LeadershipUnit,
  Error,
  { id: string; input: UpdateLeadershipUnitInput }
> {
  const invalidate = useInvalidateLeadership();
  return useMutation({
    mutationFn: ({ id, input }) => updateUser(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteLeadershipUnit(): UseMutationResult<null, Error, string> {
  const invalidate = useInvalidateLeadership();
  return useMutation({ mutationFn: deleteUser, onSuccess: invalidate });
}

export function useChangePasswordLeadershipUnit(): UseMutationResult<
  null,
  Error,
  { id: string; input: ChangePasswordInput }
> {
  const invalidate = useInvalidateLeadership();
  return useMutation({
    mutationFn: ({ id, input }) => changePassword(id, input),
    onSuccess: invalidate,
  });
}
