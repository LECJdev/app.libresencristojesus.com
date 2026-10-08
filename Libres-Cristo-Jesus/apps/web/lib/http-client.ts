import type { ApiErrorDetail, ApiResponse, ApiSuccessResponse, PaginationMeta } from '@lcj/types';
import { useSessionStore } from '@/store/session-store';
import { apiBaseUrl } from '@/lib/api-base-url';

/**
 * Routes that must never trigger the silent-refresh-and-retry flow below —
 * retrying `/auth/login` on 401 would just replay bad credentials, and
 * retrying `/auth/refresh` on its own 401 would recurse forever.
 */
const NO_REFRESH_RETRY_PATHS = new Set(['/auth/login', '/auth/refresh']);

/**
 * Descubierto con el e2e de navegador real de la Fase 10
 * (`apps/web/e2e/offline-flow.e2e.spec.ts`, caso de escritura offline): si la
 * conexión se corta a mitad de una request (no un rechazo limpio del socket),
 * `fetch` puede quedarse colgado indefinidamente — nunca resuelve ni
 * rechaza. Sin este límite, `withOfflineFallback` (Regla 1: "el usuario
 * nunca deberá perder información por ausencia de Internet") nunca llega a
 * ejecutarse, porque está esperando un error de transporte que jamás llega.
 */
const REQUEST_TIMEOUT_MS = 20_000;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** Plain object/array body — JSON-stringified automatically. */
  body?: unknown;
}

/** Typed error thrown for every non-2xx or `{success: false}` response. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Sends one request against `apps/api` and unwraps the
 * `ResponseWrapperInterceptor`/`AllExceptionsFilter` envelope
 * (`{success, message, data}` / `{success, message, errors}`) — every
 * response, success or error, always carries this shape (doc19 §4), so
 * this never needs to special-case an empty body.
 */
async function sendRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiSuccessResponse<T>> {
  const { accessToken } = useSessionStore.getState();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      headers,
      // Required for the browser to send/accept the httpOnly `refreshToken`
      // cookie set by POST /auth/login and /auth/refresh.
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal ?? timeoutController.signal,
    });
  } catch (error) {
    // Same `status: 0` used for "no response at all" elsewhere in this file
    // (see `sendUpload`'s `error` listener) — `withOfflineFallback` treats
    // it as a transport failure regardless of whether the browser reported
    // it as a clean rejection or as our own timeout abort.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Tiempo de espera agotado. Sin respuesta del servidor.', 0);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiError(json.message, response.status, json.errors);
  }

  // The WHOLE envelope is returned, not just `data`: list endpoints carry
  // their pagination in `meta` (doc19 §6), and a transport that discards it
  // makes every pager in the product impossible to build.
  return json;
}

let refreshPromise: Promise<string> | null = null;

/**
 * De-duplicates concurrent refreshes: if several requests 401 at once,
 * only one `POST /auth/refresh` is sent — everyone else awaits it.
 */
function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = sendRequest<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
      .then((envelope) => envelope.data.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Main entry point for every HTTP call to `apps/api`. On a 401 from any
 * endpoint other than login/refresh, attempts exactly one silent
 * `/auth/refresh` and retries the original request once with the new
 * access token. If the refresh also fails, clears the session store and
 * lets the error propagate — route protection (built elsewhere) is
 * responsible for redirecting to login; this layer never touches
 * `window.location` directly.
 */
async function requestWithRefresh<T>(
  path: string,
  options: ApiRequestOptions,
): Promise<ApiSuccessResponse<T>> {
  try {
    return await sendRequest<T>(path, options);
  } catch (error) {
    const canRetry =
      error instanceof ApiError && error.status === 401 && !NO_REFRESH_RETRY_PATHS.has(path);
    if (!canRetry) {
      throw error;
    }

    try {
      const newAccessToken = await refreshAccessToken();
      const { user } = useSessionStore.getState();
      // `user` is always non-null here in practice: the store only ever
      // holds an access token alongside a user (set together by
      // `setSession`, cleared together by `clearSession`).
      if (user) {
        useSessionStore.getState().setSession(newAccessToken, user);
      }
      return await sendRequest<T>(path, options);
    } catch {
      useSessionStore.getState().clearSession();
      throw error;
    }
  }
}

/**
 * Main entry point for every HTTP call to `apps/api`. Returns the payload
 * only — use `apiFetchPaginated` when the endpoint's `meta` matters.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const envelope = await requestWithRefresh<T>(path, options);
  return envelope.data;
}

/** A list payload together with the pagination it came with (doc19 §6). */
export interface PaginatedResult<T> {
  data: T;
  meta: PaginationMeta;
}

/**
 * Same transport as `apiFetch`, for list endpoints that paginate.
 *
 * A missing or malformed `meta` is normalised into a single-page result
 * derived from the payload rather than thrown away or faked as zero: a
 * pager showing "0 de 0" above visible rows is a bug users report, and an
 * exception here would break a screen whose data actually arrived fine.
 */
export async function apiFetchPaginated<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<PaginatedResult<T>> {
  const envelope = await requestWithRefresh<T>(path, options);
  return { data: envelope.data, meta: normalizeMeta(envelope.meta, envelope.data) };
}

function normalizeMeta(meta: ApiSuccessResponse<unknown>['meta'], data: unknown): PaginationMeta {
  if (isPaginationMeta(meta)) {
    return meta;
  }

  const total = Array.isArray(data) ? data.length : 0;
  return { page: 1, pageSize: total, total, pages: total > 0 ? 1 : 0 };
}

export interface UploadOptions {
  /** Fraction complete, 0..1. Fired repeatedly while bytes are in flight. */
  onProgress?: (fraction: number) => void;
  /** Aborts the transfer. The promise rejects with an `UploadAbortedError`. */
  signal?: AbortSignal;
}

/** Thrown when the caller cancels an upload, so callers can ignore it quietly. */
export class UploadAbortedError extends Error {
  constructor() {
    super('Carga cancelada.');
    this.name = 'UploadAbortedError';
  }
}

/**
 * Multipart upload with real progress and cancellation.
 *
 * WHY XMLHttpRequest AND NOT `fetch`
 * `fetch` still cannot report upload progress — the Streams-based
 * request body that would allow it is not available across the browsers
 * this PWA targets. A progress bar that jumps from 0 % to 100 % is worse
 * than none on a phone uploading a photo over mobile data, so this one
 * path uses XHR deliberately. Everything else in the app stays on `fetch`.
 *
 * `Content-Type` is intentionally NOT set: the browser must generate it
 * itself so it can append the multipart boundary. Setting it by hand
 * produces a body the server cannot parse.
 */
async function sendUpload<T>(
  path: string,
  formData: FormData,
  options: UploadOptions = {},
): Promise<ApiSuccessResponse<T>> {
  const { accessToken } = useSessionStore.getState();

  return new Promise<ApiSuccessResponse<T>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl()}${path}`);
    // Carries the httpOnly refresh cookie, mirroring `credentials: 'include'`.
    xhr.withCredentials = true;
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }

    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          options.onProgress?.(event.loaded / event.total);
        }
      });
    }

    const abort = () => {
      xhr.abort();
    };
    options.signal?.addEventListener('abort', abort, { once: true });

    const cleanup = () => {
      options.signal?.removeEventListener('abort', abort);
    };

    xhr.addEventListener('load', () => {
      cleanup();
      let parsed: ApiResponse<T>;
      try {
        parsed = JSON.parse(xhr.responseText) as ApiResponse<T>;
      } catch {
        reject(new ApiError('El servidor devolvió una respuesta ilegible.', xhr.status));
        return;
      }

      if (!parsed.success) {
        reject(new ApiError(parsed.message, xhr.status, parsed.errors));
        return;
      }

      resolve(parsed);
    });

    xhr.addEventListener('error', () => {
      cleanup();
      reject(new ApiError('No fue posible conectar con el servidor.', 0));
    });

    xhr.addEventListener('abort', () => {
      cleanup();
      reject(new UploadAbortedError());
    });

    xhr.send(formData);
  });
}

/**
 * Uploads a file, retrying once after a silent token refresh — the same
 * contract every other call in this module honours. Without it a photo
 * chosen after fifteen idle minutes would fail with a 401 the user could
 * only fix by reloading the page.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: UploadOptions = {},
): Promise<T> {
  try {
    const envelope = await sendUpload<T>(path, formData, options);
    return envelope.data;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    try {
      const newAccessToken = await refreshAccessToken();
      const { user } = useSessionStore.getState();
      if (user) {
        useSessionStore.getState().setSession(newAccessToken, user);
      }
      const retried = await sendUpload<T>(path, formData, options);
      return retried.data;
    } catch (retryError) {
      if (retryError instanceof UploadAbortedError) {
        throw retryError;
      }
      useSessionStore.getState().clearSession();
      throw error;
    }
  }
}

function isPaginationMeta(value: unknown): value is PaginationMeta {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<PaginationMeta>;
  return (
    typeof candidate.page === 'number' &&
    typeof candidate.pageSize === 'number' &&
    typeof candidate.total === 'number' &&
    typeof candidate.pages === 'number'
  );
}
