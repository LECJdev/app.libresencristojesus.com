import type { ReportPreview, ReportType } from '@lcj/types';
import { ApiError, apiFetchPaginated, type PaginatedResult } from '@/lib/http-client';
import { apiBaseUrl } from '@/lib/api-base-url';
import { useSessionStore } from '@/store/session-store';
import { toQueryString } from './query-string';

/**
 * Reportes consolidados y su exportación (doc05: "Exportar Excel" ✅✅✅✅).
 *
 * Read only. The API narrows every report by the caller's role, so none of
 * these calls carries a scope — a `districtId` here is a FILTER the user
 * chose, never a claim about what they may see.
 */

export interface ReportParams {
  page?: number;
  pageSize?: number;
  peaceHouseId?: string;
  districtId?: string;
  from?: string;
  to?: string;
}

export function getReportPreview(
  type: ReportType,
  params: ReportParams = {},
): Promise<PaginatedResult<ReportPreview>> {
  return apiFetchPaginated<ReportPreview>(`/reports/${type}${toQueryString({ ...params })}`);
}

export interface DownloadedReport {
  blob: Blob;
  filename: string;
}

/**
 * Downloads the report as a spreadsheet.
 *
 * WHY NOT AN `<a href>` OR `window.open`
 * `GET /reports/:type/export` sits behind `@RequirePermission('report',
 * 'export')`, and a browser attaches no Authorization header to a plain
 * navigation — the user would get a 401 rendered as a blank tab. Fetching
 * the bytes with the token and handing back a Blob is what makes a
 * protected download work without making the endpoint public. Same reason
 * `downloadFile` exists for images.
 *
 * `apiFetch` is deliberately bypassed: the response is a binary file, not
 * the JSON envelope it would try to unwrap.
 */
export async function downloadReport(
  type: ReportType,
  params: ReportParams = {},
): Promise<DownloadedReport> {
  const { accessToken } = useSessionStore.getState();

  // Pagination is meaningless for an export — the server returns the whole
  // filtered set — so it is stripped rather than sent and ignored.
  const { page: _page, pageSize: _pageSize, ...filters } = params;

  const url = `${apiBaseUrl()}/reports/${type}/export${toQueryString({ ...filters })}`;

  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError('No fue posible generar el archivo.', response.status);
  }

  return {
    blob: await response.blob(),
    filename: filenameFrom(response.headers.get('content-disposition')),
  };
}

/**
 * Reads the name the SERVER chose, so the downloaded file matches what the
 * API logged. The fallback exists because a proxy may strip the header, and
 * a download with no name is worse than a generic one.
 */
function filenameFrom(header: string | null): string {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? 'reporte.xlsx';
}
