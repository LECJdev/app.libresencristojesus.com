'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreateKidsChildInput,
  CreateKidsGuardianInput,
  KidsChild,
  KidsChildDetail,
  KidsChildGuardian,
  KidsConsent,
  KidsGuardian,
  UpdateKidsChildInput,
  UpdateKidsConsentInput,
  UpdateKidsGuardianInput,
} from '@lcj/types';
import {
  addKidsGuardian,
  createKidsChild,
  getKidsChild,
  listKidsChildren,
  updateKidsChild,
  updateKidsConsent,
  updateKidsGuardian,
} from '@/lib/api/kids-children';

export const kidsChildKeys = {
  all: ['kids-children'] as const,
  bySchool: (schoolId: string) => [...kidsChildKeys.all, 'school', schoolId] as const,
  detail: (id: string) => [...kidsChildKeys.all, 'detail', id] as const,
};

export function useKidsChildren(
  schoolId: string | undefined,
): UseQueryResult<KidsChild[], Error> {
  return useQuery({
    queryKey: kidsChildKeys.bySchool(schoolId ?? ''),
    enabled: Boolean(schoolId),
    queryFn: () => listKidsChildren(schoolId!),
  });
}

export function useKidsChild(id: string | undefined): UseQueryResult<KidsChildDetail, Error> {
  return useQuery({
    queryKey: kidsChildKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getKidsChild(id!),
  });
}

export function useCreateKidsChild(): UseMutationResult<
  KidsChildDetail,
  Error,
  { schoolId: string; input: CreateKidsChildInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, input }) => createKidsChild(schoolId, input),
    onSuccess: (_data, { schoolId }) =>
      queryClient.invalidateQueries({ queryKey: kidsChildKeys.bySchool(schoolId) }),
  });
}

/** Writes the server's response straight into the detail cache — every mutation returns the whole child. */
function useApplyChildDetail() {
  const queryClient = useQueryClient();
  return (child: KidsChildDetail) => {
    queryClient.setQueryData(kidsChildKeys.detail(child.id), child);
    queryClient.invalidateQueries({ queryKey: kidsChildKeys.bySchool(child.kidsSchoolId) });
  };
}

export function useUpdateKidsChild(): UseMutationResult<
  KidsChildDetail,
  Error,
  { id: string; input: UpdateKidsChildInput }
> {
  const apply = useApplyChildDetail();
  return useMutation({
    mutationFn: ({ id, input }) => updateKidsChild(id, input),
    onSuccess: apply,
  });
}

export function useAddKidsGuardian(): UseMutationResult<
  KidsChildGuardian,
  Error,
  { childId: string; input: CreateKidsGuardianInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, input }) => addKidsGuardian(childId, input),
    onSuccess: (_data, { childId }) =>
      queryClient.invalidateQueries({ queryKey: kidsChildKeys.detail(childId) }),
  });
}

export function useUpdateKidsGuardian(): UseMutationResult<
  KidsGuardian,
  Error,
  { id: string; childId: string; input: UpdateKidsGuardianInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateKidsGuardian(id, input),
    onSuccess: (_data, { childId }) =>
      queryClient.invalidateQueries({ queryKey: kidsChildKeys.detail(childId) }),
  });
}

export function useUpdateKidsConsent(): UseMutationResult<
  KidsConsent,
  Error,
  { childId: string; input: UpdateKidsConsentInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, input }) => updateKidsConsent(childId, input),
    onSuccess: (_data, { childId }) =>
      queryClient.invalidateQueries({ queryKey: kidsChildKeys.detail(childId) }),
  });
}
