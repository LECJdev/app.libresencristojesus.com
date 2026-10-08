import type {
  CreatePeaceHouseInput,
  LeadershipHistoryEntry,
  PeaceHouse,
  RecordStatus,
  UpdatePeaceHouseInput,
} from '@lcj/types';
import { apiFetch, apiFetchPaginated, type PaginatedResult } from '@/lib/http-client';
import { toQueryString } from './query-string';

/** `Casa de Paz` endpoints (doc07). */

export interface ListPeaceHousesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  districtId?: string;
  departmentId?: string;
  municipalityId?: string;
  /** The LeadershipUnit leading the Casa de Paz — how a Líder narrows the list to their own. */
  leadershipUnitId?: string;
  status?: RecordStatus;
}

export function listPeaceHouses(
  params: ListPeaceHousesParams = {},
): Promise<PaginatedResult<PeaceHouse[]>> {
  return apiFetchPaginated<PeaceHouse[]>(`/peace-houses${toQueryString({ ...params })}`);
}

export function getPeaceHouse(id: string): Promise<PeaceHouse> {
  return apiFetch<PeaceHouse>(`/peace-houses/${id}`);
}

/** Full leadership timeline, newest period first (doc06 §10/§14). */
export function getPeaceHouseLeadershipHistory(id: string): Promise<LeadershipHistoryEntry[]> {
  return apiFetch<LeadershipHistoryEntry[]>(`/peace-houses/${id}/leadership-history`);
}

export function createPeaceHouse(input: CreatePeaceHouseInput): Promise<PeaceHouse> {
  return apiFetch<PeaceHouse>('/peace-houses', { method: 'POST', body: input });
}

export function updatePeaceHouse(id: string, input: UpdatePeaceHouseInput): Promise<PeaceHouse> {
  return apiFetch<PeaceHouse>(`/peace-houses/${id}`, { method: 'PATCH', body: input });
}

export function deletePeaceHouse(id: string): Promise<null> {
  return apiFetch<null>(`/peace-houses/${id}`, { method: 'DELETE' });
}
