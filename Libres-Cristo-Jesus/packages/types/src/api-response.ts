/**
 * API response envelope shared by `apps/api` (producer) and `apps/web`
 * (consumer). Source of truth: `Documentos/19 – API Contract Book.md`,
 * section 4 ("Formato Respuesta") and section 6 ("Paginación").
 *
 * The envelope is intentionally the ONLY shape every HTTP response uses
 * — see `apps/api/src/common/interceptors/response-wrapper.interceptor.ts`
 * and `apps/api/src/common/filters/all-exceptions.filter.ts`.
 */

/** `meta` shape for paginated list endpoints (doc19 section 6). */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

/** A single field-level validation error (doc19 section 4, error example). */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  /** Present for paginated listings; omitted otherwise. */
  meta?: PaginationMeta | Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: ApiErrorDetail[];
}

/** Union of every possible HTTP JSON body this API returns. */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
