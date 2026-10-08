import type { KidsChecklist, KidsSchoolMetrics } from '@lcj/types';
import { apiFetch } from '@/lib/http-client';

/**
 * Reuniones + asistencia semanal + métricas de sede — `kids-attendance`
 * module endpoints.
 *
 * A diferencia de `lib/api/attendance.ts` (Casas de Paz), estas escrituras
 * NO pasan por `withOfflineFallback`: la cola offline (Fase 10, RN-1202) solo
 * conoce los `SyncOperationType` de Casas de Paz — el backend de
 * `kids-attendance` nunca implementó su procesamiento, así que encolar una
 * marca de Escuela Kids aquí prometería una sincronización que el servidor
 * no sabe aplicar.
 */

export function openCurrentKidsMeeting(schoolId: string): Promise<KidsChecklist> {
  return apiFetch<KidsChecklist>(`/kids/schools/${schoolId}/meetings/current`, {
    method: 'POST',
  });
}

export function getKidsMetrics(schoolId: string): Promise<KidsSchoolMetrics> {
  return apiFetch<KidsSchoolMetrics>(`/kids/schools/${schoolId}/metrics`);
}

export function getKidsChecklist(meetingId: string): Promise<KidsChecklist> {
  return apiFetch<KidsChecklist>(`/kids/meetings/${meetingId}`);
}

export function markKidsAttendance(
  meetingId: string,
  childId: string,
  present: boolean,
): Promise<KidsChecklist> {
  return apiFetch<KidsChecklist>(`/kids/meetings/${meetingId}/children/${childId}`, {
    method: 'PATCH',
    body: { present },
  });
}

export function markAllKidsAttendance(
  meetingId: string,
  childIds?: string[],
): Promise<KidsChecklist> {
  return apiFetch<KidsChecklist>(`/kids/meetings/${meetingId}/mark-all`, {
    method: 'POST',
    body: { childIds },
  });
}

export function unmarkAllKidsAttendance(
  meetingId: string,
  childIds?: string[],
): Promise<KidsChecklist> {
  return apiFetch<KidsChecklist>(`/kids/meetings/${meetingId}/unmark-all`, {
    method: 'POST',
    body: { childIds },
  });
}
