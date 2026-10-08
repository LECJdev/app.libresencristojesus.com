import type {
  CreateLeadershipUnitInput,
  LeadershipUnit,
  UpdateLeadershipUnitInput,
} from '@lcj/types';
import { apiFetch, apiFetchPaginated, type PaginatedResult } from '@/lib/http-client';
import { toQueryString } from './query-string';

/**
 * `LeadershipUnit` endpoints — the shared account of a couple (doc06 §3).
 *
 * There is NO separate "pastores generales" or "líderes" resource: those
 * are this same entity filtered by role. Creating parallel endpoints would
 * duplicate the whole CRUD, its validation and its audit trail for no
 * gain, and the two copies would drift the first time a rule changed.
 */

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  roleId?: string;
  status?: string;
}

export function listUsers(
  params: ListUsersParams = {},
): Promise<PaginatedResult<LeadershipUnit[]>> {
  return apiFetchPaginated<LeadershipUnit[]>(`/users${toQueryString({ ...params })}`);
}

export function getUser(id: string): Promise<LeadershipUnit> {
  return apiFetch<LeadershipUnit>(`/users/${id}`);
}

export function createUser(input: CreateLeadershipUnitInput): Promise<LeadershipUnit> {
  return apiFetch<LeadershipUnit>('/users', { method: 'POST', body: input });
}

export function updateUser(id: string, input: UpdateLeadershipUnitInput): Promise<LeadershipUnit> {
  return apiFetch<LeadershipUnit>(`/users/${id}`, { method: 'PATCH', body: input });
}

export function deleteUser(id: string): Promise<null> {
  return apiFetch<null>(`/users/${id}`, { method: 'DELETE' });
}

export interface ChangePasswordInput {
  memberId: string;
  newPassword: string;
  version: number;
}

export function changePassword(id: string, input: ChangePasswordInput): Promise<null> {
  return apiFetch<null>(`/users/${id}/password`, { method: 'PATCH', body: input });
}
