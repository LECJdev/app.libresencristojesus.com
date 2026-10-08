'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CreateKidsAssignmentInput,
  CreateKidsSchoolInput,
  KidsAssignment,
  KidsSchool,
  UpdateKidsSchoolInput,
} from '@lcj/types';
import {
  createKidsAssignment,
  createKidsSchool,
  getKidsSchool,
  listKidsAssignments,
  listKidsSchools,
  removeKidsAssignment,
  removeKidsSchool,
  updateKidsSchool,
} from '@/lib/api/kids-schools';

export const kidsSchoolKeys = {
  all: ['kids-schools'] as const,
  list: () => [...kidsSchoolKeys.all, 'list'] as const,
  detail: (id: string) => [...kidsSchoolKeys.all, 'detail', id] as const,
  assignments: (id: string) => [...kidsSchoolKeys.all, 'assignments', id] as const,
};

export function useKidsSchools(): UseQueryResult<KidsSchool[], Error> {
  return useQuery({ queryKey: kidsSchoolKeys.list(), queryFn: listKidsSchools });
}

export function useKidsSchool(id: string | undefined): UseQueryResult<KidsSchool, Error> {
  return useQuery({
    queryKey: kidsSchoolKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => getKidsSchool(id!),
  });
}

export function useKidsAssignments(
  schoolId: string | undefined,
): UseQueryResult<KidsAssignment[], Error> {
  return useQuery({
    queryKey: kidsSchoolKeys.assignments(schoolId ?? ''),
    enabled: Boolean(schoolId),
    queryFn: () => listKidsAssignments(schoolId!),
  });
}

export function useCreateKidsSchool(): UseMutationResult<
  KidsSchool,
  Error,
  CreateKidsSchoolInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKidsSchool,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kidsSchoolKeys.all }),
  });
}

export function useUpdateKidsSchool(): UseMutationResult<
  KidsSchool,
  Error,
  { id: string; input: UpdateKidsSchoolInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateKidsSchool(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kidsSchoolKeys.all }),
  });
}

export function useRemoveKidsSchool(): UseMutationResult<null, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeKidsSchool(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kidsSchoolKeys.all }),
  });
}

export function useCreateKidsAssignment(): UseMutationResult<
  KidsAssignment,
  Error,
  { schoolId: string; input: CreateKidsAssignmentInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, input }) => createKidsAssignment(schoolId, input),
    onSuccess: (_data, { schoolId }) =>
      queryClient.invalidateQueries({ queryKey: kidsSchoolKeys.assignments(schoolId) }),
  });
}

export function useRemoveKidsAssignment(): UseMutationResult<
  null,
  Error,
  { schoolId: string; assignmentId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, assignmentId }) => removeKidsAssignment(schoolId, assignmentId),
    onSuccess: (_data, { schoolId }) =>
      queryClient.invalidateQueries({ queryKey: kidsSchoolKeys.assignments(schoolId) }),
  });
}
