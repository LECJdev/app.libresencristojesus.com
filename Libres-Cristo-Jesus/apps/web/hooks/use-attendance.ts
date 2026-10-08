'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { AttendanceChecklist } from '@lcj/types';
import { markAll, markAttendance, openCurrentMeeting, unlockMeeting } from '@/lib/api/attendance';
import { peopleKeys } from './use-people';

export const attendanceKeys = {
  all: ['attendance'] as const,
  current: (peaceHouseId: string) => [...attendanceKeys.all, 'current', peaceHouseId] as const,
};

/**
 * This week's sheet for a Casa de Paz.
 *
 * A QUERY even though the endpoint is a POST: from the caller's side this
 * is "give me the sheet", and the creation is an implementation detail of
 * the first access. Modelling it as a mutation would mean the screen had
 * to trigger it manually on mount and handle its own retry and caching.
 *
 * `staleTime: 0` on purpose — the lock can flip between two visits (a week
 * rolls over, a reopening expires), and a stale sheet would offer edits the
 * server is about to refuse.
 */
export function useCurrentMeeting(
  peaceHouseId: string | undefined,
): UseQueryResult<AttendanceChecklist, Error> {
  return useQuery({
    queryKey: attendanceKeys.current(peaceHouseId ?? ''),
    enabled: Boolean(peaceHouseId),
    queryFn: () => openCurrentMeeting(peaceHouseId!),
    staleTime: 0,
  });
}

/**
 * Writes the server's response straight into the cache instead of
 * refetching: every mutation already returns the complete sheet, so a
 * second round trip would show the user a spinner for data they have.
 */
function useApplyChecklist(peaceHouseId: string | undefined) {
  const queryClient = useQueryClient();

  return (checklist: AttendanceChecklist) => {
    queryClient.setQueryData(attendanceKeys.current(peaceHouseId ?? ''), checklist);
  };
}

export function useMarkAttendance(
  peaceHouseId: string | undefined,
): UseMutationResult<
  AttendanceChecklist,
  Error,
  { meetingId: string; personId: string; present: boolean; comments?: string }
> {
  const apply = useApplyChecklist(peaceHouseId);

  return useMutation({
    mutationFn: ({ meetingId, personId, present, comments }) =>
      markAttendance(meetingId, personId, present, comments),
    onSuccess: apply,
  });
}

export function useMarkAll(
  peaceHouseId: string | undefined,
): UseMutationResult<AttendanceChecklist, Error, { meetingId: string; present: boolean }> {
  const apply = useApplyChecklist(peaceHouseId);

  return useMutation({
    mutationFn: ({ meetingId, present }) => markAll(meetingId, present),
    onSuccess: apply,
  });
}

export function useUnlockMeeting(
  peaceHouseId: string | undefined,
): UseMutationResult<AttendanceChecklist, Error, { meetingId: string; reason: string }> {
  const apply = useApplyChecklist(peaceHouseId);

  return useMutation({
    mutationFn: ({ meetingId, reason }) => unlockMeeting(meetingId, reason),
    onSuccess: apply,
  });
}

/**
 * Refreshes the sheet after someone is registered mid-meeting.
 *
 * Creating a person from the attendance screen adds them to the roster, so
 * the checklist must be refetched — and the people lists too, since the new
 * record belongs there as well.
 */
export function useRefreshAfterPersonCreated(
  peaceHouseId: string | undefined,
): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: attendanceKeys.current(peaceHouseId ?? '') }),
      queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
    ]);
  };
}
