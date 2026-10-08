'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DashboardSummary, DashboardTrends, MapStats } from '@lcj/types';
import { getDashboardSummary, getDashboardTrends, getMapStats } from '@/lib/api/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: ['dashboard', 'summary'] as const,
  trends: (months: number) => ['dashboard', 'trends', months] as const,
  map: ['dashboard', 'map'] as const,
};

/**
 * Aggregates move on the scale of a meeting, not a keystroke, so a five
 * minute `staleTime` keeps a dashboard from re-querying the whole country
 * every time someone tabs back to it. The server caches the map on top of
 * this for the same reason.
 */
const AGGREGATE_STALE_MS = 5 * 60 * 1000;

export function useDashboardSummary(): UseQueryResult<DashboardSummary, Error> {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: getDashboardSummary,
    staleTime: AGGREGATE_STALE_MS,
  });
}

export function useDashboardTrends(months = 12): UseQueryResult<DashboardTrends, Error> {
  return useQuery({
    queryKey: dashboardKeys.trends(months),
    queryFn: () => getDashboardTrends(months),
    staleTime: AGGREGATE_STALE_MS,
  });
}

export function useMapStats(): UseQueryResult<MapStats, Error> {
  return useQuery({
    queryKey: dashboardKeys.map,
    queryFn: getMapStats,
    staleTime: AGGREGATE_STALE_MS,
  });
}
