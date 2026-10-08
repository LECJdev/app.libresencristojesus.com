import type {
  AddMeetingPhotoInput,
  MeetingReport,
  UpdateMeetingPhotoInput,
  UpdateMeetingReportInput,
  UpsertOfferingInput,
} from '@lcj/types';
import { apiFetch } from '@/lib/http-client';
import { withOfflineFallback } from '@/lib/offline/with-offline-fallback';

/**
 * Registro de la reunión — tema, predicador, observaciones, ofrenda y
 * fotografías (doc01 RF-022..RF-026).
 *
 * Every mutation returns the WHOLE report, exactly like the attendance
 * checklist does: registering an offering can also change the lock state
 * (a reopening may have expired between two clicks), so re-rendering from
 * a partial response would show a screen that quietly disagrees with the
 * server.
 *
 * The meeting travels in the PATH on every call: `ScopeGuard` resolves the
 * Casa de Paz from `meetingId`, and an id in the body would be invisible to
 * it.
 */

export function getMeetingReport(meetingId: string): Promise<MeetingReport> {
  return apiFetch<MeetingReport>(`/meetings/${meetingId}/report`);
}

export function updateMeetingReport(
  meetingId: string,
  input: UpdateMeetingReportInput,
): Promise<MeetingReport> {
  return withOfflineFallback(
    () =>
      apiFetch<MeetingReport>(`/meetings/${meetingId}/report`, {
        method: 'PATCH',
        body: input,
      }),
    { type: 'MEETING_REPORT', meetingId, payload: { ...input } },
  );
}

/** PUT and not POST: there is exactly one offering per meeting (RN-039). */
export function upsertOffering(
  meetingId: string,
  input: UpsertOfferingInput,
): Promise<MeetingReport> {
  return withOfflineFallback(
    () =>
      apiFetch<MeetingReport>(`/meetings/${meetingId}/offering`, {
        method: 'PUT',
        body: input,
      }),
    { type: 'OFFERING_UPSERT', meetingId, payload: { ...input } },
  );
}

/** Soft delete — RN-042 requires every movement to stay traceable. */
export function removeOffering(meetingId: string): Promise<MeetingReport> {
  return apiFetch<MeetingReport>(`/meetings/${meetingId}/offering`, { method: 'DELETE' });
}

/** Attaches a path already returned by `POST /files/upload`, never a binary. */
export function addMeetingPhoto(
  meetingId: string,
  input: AddMeetingPhotoInput,
): Promise<MeetingReport> {
  /*
   * Only the ATTACHMENT is queued, never the image bytes. The photo reaches
   * storage through `POST /files/upload`, which needs a connection — so
   * offline capture ends at the moment there is a stored path to attach.
   * Queuing base64 image data would blow past IndexedDB's quota on a single
   * meeting and is the reason this limitation is documented rather than
   * hidden.
   */
  return withOfflineFallback(
    () =>
      apiFetch<MeetingReport>(`/meetings/${meetingId}/photos`, {
        method: 'POST',
        body: input,
      }),
    { type: 'MEETING_PHOTO_ADD', meetingId, payload: { ...input } },
  );
}

export function updateMeetingPhoto(
  meetingId: string,
  photoId: string,
  input: UpdateMeetingPhotoInput,
): Promise<MeetingReport> {
  return apiFetch<MeetingReport>(`/meetings/${meetingId}/photos/${photoId}`, {
    method: 'PATCH',
    body: input,
  });
}
