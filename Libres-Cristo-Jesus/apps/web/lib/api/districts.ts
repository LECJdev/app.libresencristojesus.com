import type { CreateDistrictInput, District, UpdateDistrictInput } from '@lcj/types';
import { apiFetch, apiFetchPaginated, type PaginatedResult } from '@/lib/http-client';
import { toQueryString } from './query-string';

/**
 * `District` endpoints. One function per route, no React — see
 * `lib/api/organization.ts` for why the data layer stays hook-free.
 */

export interface ListDistrictsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  churchId?: string;
}

export function listDistricts(
  params: ListDistrictsParams = {},
): Promise<PaginatedResult<District[]>> {
  return apiFetchPaginated<District[]>(`/districts${toQueryString({ ...params })}`);
}

export function getDistrict(id: string): Promise<District> {
  return apiFetch<District>(`/districts/${id}`);
}

export function createDistrict(input: CreateDistrictInput): Promise<District> {
  return apiFetch<District>('/districts', { method: 'POST', body: input });
}

export function updateDistrict(id: string, input: UpdateDistrictInput): Promise<District> {
  return apiFetch<District>(`/districts/${id}`, { method: 'PATCH', body: input });
}

export function deleteDistrict(id: string): Promise<null> {
  return apiFetch<null>(`/districts/${id}`, { method: 'DELETE' });
}
