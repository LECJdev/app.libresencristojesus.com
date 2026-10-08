import type { Department, Municipality } from '@lcj/types';
import { apiFetchPaginated } from '@/lib/http-client';
import { toQueryString } from './query-string';

/**
 * Geographic catalogs — read-only (doc04 §3: system-administered tables,
 * written solely by `ColombiaSeeder`).
 *
 * Never a hard-coded list: the department and municipality options come
 * from `CatDepartment`/`CatMunicipality` exclusively, which is the whole
 * reason those tables exist.
 */

/**
 * `PaginationQueryDto` caps `pageSize` at 100 (`@Max(100)`), and that cap
 * is a shared contract every endpoint depends on — not something to raise
 * for one dropdown.
 */
const MAX_PAGE_SIZE = 100;

/**
 * Walks every page of a catalog endpoint.
 *
 * WHY THIS EXISTS AND IS NOT A SINGLE REQUEST
 * Antioquia has 125 municipalities — more than the 100 the API will return
 * in one page. A single call would silently drop 25 of them, and the only
 * symptom would be a municipality missing from a dropdown, which reads as
 * "the catalog is incomplete" rather than "the client truncated it". That
 * is the kind of bug that survives for months.
 *
 * The loop is bounded by the server's own `meta.pages`, so it cannot spin
 * if the API misbehaves.
 */
async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number>,
): Promise<T[]> {
  const first = await apiFetchPaginated<T[]>(
    `${path}${toQueryString({ ...params, page: 1, pageSize: MAX_PAGE_SIZE })}`,
  );

  if (first.meta.pages <= 1) {
    return first.data;
  }

  const remaining = await Promise.all(
    Array.from({ length: first.meta.pages - 1 }, (_, index) =>
      apiFetchPaginated<T[]>(
        `${path}${toQueryString({ ...params, page: index + 2, pageSize: MAX_PAGE_SIZE })}`,
      ),
    ),
  );

  return [first.data, ...remaining.map((page) => page.data)].flat();
}

/** All 33 departments (32 + Bogotá D.C.). */
export function listDepartments(): Promise<Department[]> {
  return fetchAllPages<Department>('/geography/departments', { sort: 'name', order: 'asc' });
}

/**
 * Municipalities of ONE department.
 *
 * Always scoped: there are 1,123 municipalities nationwide, and shipping
 * them all to a phone to populate a `<select>` would be indefensible. The
 * form asks for the department first precisely so this stays small.
 */
export function listMunicipalities(departmentId: string): Promise<Municipality[]> {
  return fetchAllPages<Municipality>('/geography/municipalities', {
    departmentId,
    sort: 'name',
    order: 'asc',
  });
}
