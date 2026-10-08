import type {
  Church,
  OrganizationSearchResult,
  OrganizationTree,
  UpdateChurchInput,
} from '@lcj/types';
import { apiFetch, apiFetchPaginated } from '@/lib/http-client';
import { toQueryString } from './query-string';

/**
 * Organización endpoints.
 *
 * One function per endpoint, no React in sight: hooks compose these, tests
 * and server-side callers can use them directly, and the React Query keys
 * live next to the hooks that own them rather than being invented at each
 * call site.
 */

/**
 * The full organigrama (doc06 §4/§7).
 *
 * No `churchId` argument: doc06 states there is a single Iglesia, and the
 * API resolves it. When the schema's multi-church future arrives, this
 * gains an optional parameter without any caller changing.
 *
 * PATH NOTE: the resource is `/organizations` (plural), not the
 * `/organization/tree` doc06 §19 sketches. The controller was built that
 * way in Fase 4 and every other route under it is plural; renaming a
 * shipped, verified module to match an illustrative path list would be a
 * breaking change bought for nothing.
 */
export function fetchOrganizationTree(): Promise<OrganizationTree> {
  return apiFetch<OrganizationTree>('/organizations/tree');
}

/**
 * The single Church.
 *
 * Reads the first row of the list rather than a dedicated endpoint,
 * because `GET /organizations/:id` needs an id the client has no way to
 * choose — there is exactly one Iglesia (doc06 module 1). Returns `null`
 * rather than throwing when none exists yet: a fresh database is an empty
 * state to render, not an error to report.
 */
export async function fetchChurch(): Promise<Church | null> {
  const { data } = await apiFetchPaginated<Church[]>('/organizations?page=1&pageSize=1');
  return data[0] ?? null;
}

export function updateChurch(id: string, input: UpdateChurchInput): Promise<Church> {
  return apiFetch<Church>(`/organizations/${id}`, { method: 'PATCH', body: input });
}

/**
 * Global search across the organisational structure (doc06 §12).
 *
 * The API requires at least 2 characters; callers gate on that so a single
 * keystroke never fires a request that can only fail.
 */
export function searchOrganization(term: string, limit = 5): Promise<OrganizationSearchResult> {
  return apiFetch<OrganizationSearchResult>(
    `/organizations/search${toQueryString({ q: term, limit })}`,
  );
}
