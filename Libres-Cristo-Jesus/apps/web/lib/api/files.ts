import type { StorageCategory, UploadedFile } from '@lcj/types';
import { ApiError, apiUpload, type UploadOptions } from '@/lib/http-client';
import { apiBaseUrl } from '@/lib/api-base-url';
import { useSessionStore } from '@/store/session-store';

/**
 * File upload/download (doc04 §15: the database keeps the path, never the
 * binary).
 *
 * The two-step flow every caller follows:
 *   upload here → receive `path` → save that `path` on the entity through
 *   its own endpoint.
 */

export function uploadFile(
  file: File,
  category: StorageCategory,
  options?: UploadOptions,
): Promise<UploadedFile> {
  const formData = new FormData();
  // Field names must match `FileInterceptor('file')` and `UploadFileDto`.
  formData.append('category', category);
  formData.append('file', file);

  return apiUpload<UploadedFile>('/files/upload', formData, options);
}

/**
 * Downloads a stored file as a Blob.
 *
 * WHY NOT JUST `<img src={apiUrl + path}>`
 * `GET /files/*path` is behind `@RequirePermission('file', 'read')`, and a
 * browser will not attach an Authorization header to an `<img>` request —
 * it would simply render a broken image. Fetching the bytes here and
 * wrapping them in an object URL is what makes a protected image
 * displayable without making the endpoint public.
 *
 * Uses `fetch` directly rather than `apiFetch`: the response is binary,
 * and `apiFetch` unwraps a JSON envelope that does not exist here.
 */
export async function downloadFile(path: string, signal?: AbortSignal): Promise<Blob> {
  const { accessToken } = useSessionStore.getState();

  const response = await fetch(`${apiBaseUrl()}/files/${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new ApiError('No fue posible cargar la imagen.', response.status);
  }

  return response.blob();
}
