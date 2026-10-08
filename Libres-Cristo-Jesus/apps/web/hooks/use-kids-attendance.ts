'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { KidsChecklist, KidsSchoolMetrics } from '@lcj/types';
import {
  getKidsMetrics,
  markAllKidsAttendance,
  markKidsAttendance,
  openCurrentKidsMeeting,
  unmarkAllKidsAttendance,
} from '@/lib/api/kids-attendance';

export const kidsAttendanceKeys = {
  all: ['kids-attendance'] as const,
  current: (schoolId: string) => [...kidsAttendanceKeys.all, 'current', schoolId] as const,
};

export const kidsMetricsKeys = {
  all: ['kids-metrics'] as const,
  bySchool: (schoolId: string) => [...kidsMetricsKeys.all, schoolId] as const,
};

/** `staleTime: 0` — same reasoning as `useCurrentMeeting`: the lock/roster can change between two visits. */
export function useCurrentKidsMeeting(
  schoolId: string | undefined,
): UseQueryResult<KidsChecklist, Error> {
  return useQuery({
    queryKey: kidsAttendanceKeys.current(schoolId ?? ''),
    enabled: Boolean(schoolId),
    queryFn: () => openCurrentKidsMeeting(schoolId!),
    staleTime: 0,
  });
}

export function useKidsMetrics(
  schoolId: string | undefined,
): UseQueryResult<KidsSchoolMetrics, Error> {
  return useQuery({
    queryKey: kidsMetricsKeys.bySchool(schoolId ?? ''),
    enabled: Boolean(schoolId),
    queryFn: () => getKidsMetrics(schoolId!),
  });
}

function useApplyKidsChecklist(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  return (checklist: KidsChecklist) => {
    queryClient.setQueryData(kidsAttendanceKeys.current(schoolId ?? ''), checklist);
    queryClient.invalidateQueries({ queryKey: kidsMetricsKeys.bySchool(schoolId ?? '') });
  };
}

export function useMarkKidsAttendance(
  schoolId: string | undefined,
): UseMutationResult<KidsChecklist, Error, { meetingId: string; childId: string; present: boolean }> {
  const apply = useApplyKidsChecklist(schoolId);
  return useMutation({
    mutationFn: ({ meetingId, childId, present }) => markKidsAttendance(meetingId, childId, present),
    onSuccess: apply,
  });
}

export function useMarkAllKidsAttendance(
  schoolId: string | undefined,
): UseMutationResult<KidsChecklist, Error, { meetingId: string; childIds?: string[] }> {
  const apply = useApplyKidsChecklist(schoolId);
  return useMutation({
    mutationFn: ({ meetingId, childIds }) => markAllKidsAttendance(meetingId, childIds),
    onSuccess: apply,
  });
}

export function useUnmarkAllKidsAttendance(
  schoolId: string | undefined,
): UseMutationResult<KidsChecklist, Error, { meetingId: string; childIds?: string[] }> {
  const apply = useApplyKidsChecklist(schoolId);
  return useMutation({
    mutationFn: ({ meetingId, childIds }) => unmarkAllKidsAttendance(meetingId, childIds),
    onSuccess: apply,
  });
}
