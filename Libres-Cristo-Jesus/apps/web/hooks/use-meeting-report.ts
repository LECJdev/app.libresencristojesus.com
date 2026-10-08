'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  AddMeetingPhotoInput,
  MeetingReport,
  UpdateMeetingPhotoInput,
  UpdateMeetingReportInput,
  UpsertOfferingInput,
} from '@lcj/types';
import {
  addMeetingPhoto,
  getMeetingReport,
  removeOffering,
  updateMeetingPhoto,
  updateMeetingReport,
  upsertOffering,
} from '@/lib/api/meetings';

export const meetingReportKeys = {
  all: ['meeting-report'] as const,
  detail: (meetingId: string) => [...meetingReportKeys.all, meetingId] as const,
};

/**
 * The report of one meeting: theme, preacher, notes, offering and photos.
 *
 * `staleTime: 0`, like the attendance sheet: both read the same lock, and
 * a stale copy would offer edits the server is about to refuse.
 */
export function useMeetingReport(
  meetingId: string | undefined,
): UseQueryResult<MeetingReport, Error> {
  return useQuery({
    queryKey: meetingReportKeys.detail(meetingId ?? ''),
    enabled: Boolean(meetingId),
    queryFn: () => getMeetingReport(meetingId!),
    staleTime: 0,
  });
}

/**
 * Writes the server's response straight into the cache instead of
 * refetching: every mutation already returns the complete report, so a
 * second round trip would show a spinner for data the client has.
 */
function useApplyReport(meetingId: string | undefined) {
  const queryClient = useQueryClient();

  return (report: MeetingReport) => {
    queryClient.setQueryData(meetingReportKeys.detail(meetingId ?? ''), report);
  };
}

export function useUpdateMeetingReport(
  meetingId: string | undefined,
): UseMutationResult<MeetingReport, Error, UpdateMeetingReportInput> {
  const apply = useApplyReport(meetingId);

  return useMutation({
    mutationFn: (input) => updateMeetingReport(meetingId!, input),
    onSuccess: apply,
  });
}

export function useUpsertOffering(
  meetingId: string | undefined,
): UseMutationResult<MeetingReport, Error, UpsertOfferingInput> {
  const apply = useApplyReport(meetingId);

  return useMutation({
    mutationFn: (input) => upsertOffering(meetingId!, input),
    onSuccess: apply,
  });
}

export function useRemoveOffering(
  meetingId: string | undefined,
): UseMutationResult<MeetingReport, Error, void> {
  const apply = useApplyReport(meetingId);

  return useMutation({
    mutationFn: () => removeOffering(meetingId!),
    onSuccess: apply,
  });
}

export function useAddMeetingPhoto(
  meetingId: string | undefined,
): UseMutationResult<MeetingReport, Error, AddMeetingPhotoInput> {
  const apply = useApplyReport(meetingId);

  return useMutation({
    mutationFn: (input) => addMeetingPhoto(meetingId!, input),
    onSuccess: apply,
  });
}

export function useUpdateMeetingPhoto(
  meetingId: string | undefined,
): UseMutationResult<MeetingReport, Error, { photoId: string; input: UpdateMeetingPhotoInput }> {
  const apply = useApplyReport(meetingId);

  return useMutation({
    mutationFn: ({ photoId, input }) => updateMeetingPhoto(meetingId!, photoId, input),
    onSuccess: apply,
  });
}
