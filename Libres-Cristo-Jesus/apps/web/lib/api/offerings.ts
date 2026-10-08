import type { OfferingHistoryRow, OfferingSummary } from '@lcj/types';
import { apiFetch, apiFetchPaginated, type PaginatedResult } from '@/lib/http-client';
import { toQueryString } from './query-string';

/**
 * Historial y estadísticas de ofrendas (doc19 `/offerings`).
 *
 * READS LIVE HERE, WRITES LIVE IN `lib/api/meetings.ts`. Registering an
 * offering belongs to the meeting that produced it — that is where the
 * weekly lock applies. Reading crosses meetings, houses and months.
 *
 * The date filters work on the MEETING date, not on when the amount was
 * typed in: a leader reporting on Tuesday for last Thursday belongs in last
 * Thursday's figures.
 */

export interface ListOfferingsParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  peaceHouseId?: string;
  districtId?: string;
  /** Inclusive, ISO-8601 (`YYYY-MM-DD`). */
  from?: string;
  /** Inclusive, ISO-8601 (`YYYY-MM-DD`). */
  to?: string;
}

export function listOfferings(
  params: ListOfferingsParams = {},
): Promise<PaginatedResult<OfferingHistoryRow[]>> {
  return apiFetchPaginated<OfferingHistoryRow[]>(`/offerings${toQueryString({ ...params })}`);
}

/**
 * Aggregated in the database over the WHOLE filter, never over the page on
 * screen — a total that changes when you turn the page is a bug users
 * report.
 */
export function getOfferingSummary(params: ListOfferingsParams = {}): Promise<OfferingSummary> {
  const { page: _page, pageSize: _pageSize, ...filters } = params;
  return apiFetch<OfferingSummary>(`/offerings/summary${toQueryString({ ...filters })}`);
}
