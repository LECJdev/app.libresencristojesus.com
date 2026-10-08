'use client';

import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ReportPreview, ReportType } from '@lcj/types';
import { downloadReport, getReportPreview, type ReportParams } from '@/lib/api/reports';
import type { PaginatedResult } from '@/lib/http-client';

export const reportKeys = {
  all: ['reports'] as const,
  preview: (type: ReportType, params: ReportParams) => [...reportKeys.all, type, params] as const,
};

export function useReportPreview(
  type: ReportType,
  params: ReportParams,
): UseQueryResult<PaginatedResult<ReportPreview>, Error> {
  return useQuery({
    queryKey: reportKeys.preview(type, params),
    queryFn: () => getReportPreview(type, params),
    placeholderData: (previous) => previous,
  });
}

/**
 * A MUTATION, not a query, even though it only reads.
 *
 * A download is a one-shot action with a side effect on the user's machine.
 * Caching it would mean a second click silently reusing the bytes of a
 * filter the user has since changed — the most confusing possible outcome
 * for a button labelled "Exportar".
 *
 * The object URL is revoked immediately: the browser has already committed
 * the download by the time the click resolves, and leaving it alive pins
 * the whole file in memory for the life of the page.
 */
export function useDownloadReport(): UseMutationResult<
  string,
  Error,
  { type: ReportType; params: ReportParams }
> {
  return useMutation({
    mutationFn: async ({ type, params }) => {
      const { blob, filename } = await downloadReport(type, params);

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      return filename;
    },
  });
}
