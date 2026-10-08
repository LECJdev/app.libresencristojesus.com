import type {
  CreatePersonInput,
  Person,
  PersonAttendanceRate,
  PersonAttendanceRow,
  PersonHistoryEntry,
  PersonStage,
  RecordStatus,
  UpdatePersonInput,
} from '@lcj/types';
import { apiFetch, apiFetchPaginated, type PaginatedResult } from '@/lib/http-client';
import { withOfflineFallback } from '@/lib/offline/with-offline-fallback';
import { toQueryString } from './query-string';

/** `Person` endpoints (doc04 §5). */

export interface ListPeopleParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  peaceHouseId?: string;
  personStageId?: string;
  status?: RecordStatus;
}

export function listPeople(params: ListPeopleParams = {}): Promise<PaginatedResult<Person[]>> {
  return apiFetchPaginated<Person[]>(`/people${toQueryString({ ...params })}`);
}

export function getPerson(id: string): Promise<Person> {
  return apiFetch<Person>(`/people/${id}`);
}

/** Membership timeline, newest period first. */
export function getPersonHistory(id: string): Promise<PersonHistoryEntry[]> {
  return apiFetch<PersonHistoryEntry[]>(`/people/${id}/history`);
}

/** Every meeting of the person's Casa de Paz since they joined it, oldest first. */
export function getPersonAttendance(id: string): Promise<PersonAttendanceRow[]> {
  return apiFetch<PersonAttendanceRow[]>(`/people/${id}/attendance`);
}

/** One rate per active roster member of a Casa de Paz. */
export function getAttendanceRates(peaceHouseId: string): Promise<PersonAttendanceRate[]> {
  return apiFetch<PersonAttendanceRate[]>(
    `/people/attendance-rates${toQueryString({ peaceHouseId })}`,
  );
}

export function listPersonStages(): Promise<PersonStage[]> {
  return apiFetch<PersonStage[]>('/people/stages');
}

/**
 * Registering someone happens at the door, mid-meeting, from a phone
 * (Regla 1). It survives a lost connection like the attendance marks do.
 */
export function createPerson(input: CreatePersonInput): Promise<Person> {
  return withOfflineFallback(() => apiFetch<Person>('/people', { method: 'POST', body: input }), {
    type: 'PERSON_CREATE',
    payload: { ...input },
  });
}

export function updatePerson(id: string, input: UpdatePersonInput): Promise<Person> {
  return apiFetch<Person>(`/people/${id}`, { method: 'PATCH', body: input });
}

/** Moves a person to another Casa de Paz, preserving the timeline. */
export function transferPerson(
  id: string,
  peaceHouseId: string,
  transferReason?: string,
): Promise<Person> {
  return apiFetch<Person>(`/people/${id}/transfer`, {
    method: 'POST',
    body: { peaceHouseId, transferReason },
  });
}

export function deletePerson(id: string): Promise<null> {
  return apiFetch<null>(`/people/${id}`, { method: 'DELETE' });
}
