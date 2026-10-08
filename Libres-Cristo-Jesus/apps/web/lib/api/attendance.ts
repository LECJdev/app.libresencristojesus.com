import type { AttendanceChecklist } from '@lcj/types';
import { apiFetch } from '@/lib/http-client';
import { withOfflineFallback } from '@/lib/offline/with-offline-fallback';

/**
 * Asistencia semanal (doc11 RN-407/RN-503).
 *
 * Every mutation returns the WHOLE checklist, not just the row it changed:
 * marking someone alters the present count and can alter the lock state
 * (a reopening may have expired between two clicks), so re-rendering from
 * a partial response would show a sheet that quietly disagrees with the
 * server.
 */

/**
 * Opens this ISO week's meeting, creating it on first access.
 *
 * The Casa de Paz travels in the PATH: `ScopeGuard` resolves the scoped
 * resource from route params, so an id in the body would be invisible to
 * it and every Líder would get a 403.
 */
export function openCurrentMeeting(peaceHouseId: string): Promise<AttendanceChecklist> {
  return apiFetch<AttendanceChecklist>(
    `/attendance/peace-houses/${peaceHouseId}/meetings/current`,
    { method: 'POST' },
  );
}

export function getChecklist(meetingId: string): Promise<AttendanceChecklist> {
  return apiFetch<AttendanceChecklist>(`/attendance/meetings/${meetingId}`);
}

/**
 * Marking is the single most important write to survive a lost connection
 * (Regla 1): it happens in someone's living room, on a phone, mid-meeting.
 * `withOfflineFallback` sends it to the local queue when the network is
 * unreachable, and the sync module later replays it with the timestamp of
 * THIS moment — which is what keeps the weekly lock from punishing a leader
 * for having no signal on a Sunday.
 */
export function markAttendance(
  meetingId: string,
  personId: string,
  present: boolean,
  comments?: string,
): Promise<AttendanceChecklist> {
  return withOfflineFallback(
    () =>
      apiFetch<AttendanceChecklist>(`/attendance/meetings/${meetingId}/people/${personId}`, {
        method: 'PATCH',
        body: { present, comments },
      }),
    {
      type: 'ATTENDANCE_MARK',
      meetingId,
      payload: { personId, present, comments },
    },
  );
}

/** One call for both "marcar todos" and "desmarcar todos". */
export function markAll(meetingId: string, present: boolean): Promise<AttendanceChecklist> {
  return withOfflineFallback(
    () =>
      apiFetch<AttendanceChecklist>(`/attendance/meetings/${meetingId}/mark-all`, {
        method: 'POST',
        body: { present },
      }),
    { type: 'ATTENDANCE_MARK_ALL', meetingId, payload: { present } },
  );
}

/** Reopens a closed week for 7 calendar days (doc11 RN-407). */
export function unlockMeeting(meetingId: string, reason: string): Promise<AttendanceChecklist> {
  return apiFetch<AttendanceChecklist>(`/attendance/meetings/${meetingId}/unlock`, {
    method: 'POST',
    body: { reason },
  });
}
