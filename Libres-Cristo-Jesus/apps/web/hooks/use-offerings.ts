'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { OfferingHistoryRow, OfferingSummary } from '@lcj/types';
import { getOfferingSummary, listOfferings, type ListOfferingsParams } from '@/lib/api/offerings';
import type { PaginatedResult } from '@/lib/http-client';

export const offeringKeys = {
  all: ['offerings'] as const,
  list: (params: ListOfferingsParams) => [...offeringKeys.all, 'list', params] as const,
  summary: (params: ListOfferingsParams) => [...offeringKeys.all, 'summary', params] as const,
};

export function useOfferings(
  params: ListOfferingsParams,
): UseQueryResult<PaginatedResult<OfferingHistoryRow[]>, Error> {
  return useQuery({
    queryKey: offeringKeys.list(params),
    queryFn: () => listOfferings(params),
    placeholderData: (previous) => previous,
  });
}

/**
 * The statistics of the SAME filter as the list, minus its pagination —
 * the summary describes the whole selection, so page and page size are
 * deliberately kept out of the key: turning the page must not refetch it.
 */
export function useOfferingSummary(
  params: Omit<ListOfferingsParams, 'page' | 'pageSize'>,
): UseQueryResult<OfferingSummary, Error> {
  return useQuery({
    queryKey: offeringKeys.summary(params),
    queryFn: () => getOfferingSummary(params),
    placeholderData: (previous) => previous,
  });
}
