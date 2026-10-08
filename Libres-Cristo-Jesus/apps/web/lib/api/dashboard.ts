import type { DashboardSummary, DashboardTrends, MapStats } from '@lcj/types';
import { apiFetch } from '@/lib/http-client';
import { toQueryString } from './query-string';

/**
 * Indicadores del Dashboard (doc11 RN-1301/RN-1302).
 *
 * READ ONLY — every figure is computed by the server, never posted by the
 * client. There is no write surface here on purpose.
 *
 * NONE of these calls carries a scope parameter: the API narrows every
 * query by the caller's role. A `districtId` sent from the browser would be
 * a request the backend has to defend against, not a feature.
 */

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary');
}

export function getDashboardTrends(months = 12): Promise<DashboardTrends> {
  return apiFetch<DashboardTrends>(`/dashboard/trends${toQueryString({ months })}`);
}

export function getMapStats(): Promise<MapStats> {
  return apiFetch<MapStats>('/dashboard/map');
}
