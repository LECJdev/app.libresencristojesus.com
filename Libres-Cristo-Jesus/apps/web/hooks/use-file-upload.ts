'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { validateUploadCandidate, type StorageCategory, type UploadedFile } from '@lcj/types';
import { downloadFile, uploadFile } from '@/lib/api/files';
import { UploadAbortedError } from '@/lib/http-client';
import { resolveApiErrorMessage } from '@/lib/api-error-message';

/**
 * Upload state machine for one file field.
 *
 * Deliberately NOT a React Query mutation: an upload is not cached data,
 * it is a one-shot transfer with progress and a cancel button, and
 * modelling it as a query would fight the library for no benefit.
 */

export type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

export interface UseFileUpload {
  status: UploadStatus;
  /** 0..1 while uploading. */
  progress: number;
  error: string | null;
  /** Validates and uploads; resolves with the stored path, or null on failure. */
  upload: (file: File) => Promise<UploadedFile | null>;
  cancel: () => void;
  reset: () => void;
}

export function useFileUpload(category: StorageCategory): UseFileUpload {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // An upload can outlive the drawer that started it. Writing state after
  // unmount is a React warning at best and a leak at worst, so every
  // setter below is gated on this.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (mountedRef.current) {
      setStatus('idle');
      setProgress(0);
      setError(null);
    }
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      setStatus('validating');
      setError(null);
      setProgress(0);

      // The same policy the server enforces (`@lcj/types`), applied before
      // spending the user's bandwidth on a file that would be rejected.
      const rejection = validateUploadCandidate(category, file.type, file.size);
      if (rejection) {
        setStatus('error');
        setError(rejection);
        return null;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus('uploading');

      try {
        const stored = await uploadFile(file, category, {
          signal: controller.signal,
          onProgress: (fraction) => {
            if (mountedRef.current) {
              setProgress(fraction);
            }
          },
        });

        if (mountedRef.current) {
          setStatus('success');
          setProgress(1);
        }
        return stored;
      } catch (caught) {
        if (!mountedRef.current) {
          return null;
        }

        // A cancellation is a user decision, not a failure to report.
        if (caught instanceof UploadAbortedError) {
          setStatus('idle');
          setProgress(0);
          return null;
        }

        setStatus('error');
        setError(resolveApiErrorMessage(caught, 'No fue posible subir el archivo.'));
        return null;
      } finally {
        controllerRef.current = null;
      }
    },
    [category],
  );

  return { status, progress, error, upload, cancel, reset };
}

/**
 * Object URL for an already-stored file.
 *
 * `GET /files/*path` requires a bearer token, so a protected image cannot
 * be shown with a plain `src`. This fetches the bytes and wraps them in an
 * object URL — and revokes it on cleanup, because those URLs pin the blob
 * in memory until explicitly released.
 */
export function useStoredFilePreview(path: string | null | undefined): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setObjectUrl(null);
      return;
    }

    const controller = new AbortController();
    let createdUrl: string | null = null;

    downloadFile(path, controller.signal)
      .then((blob) => {
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        // A missing or forbidden file degrades to "no preview"; the field
        // still holds its path and the form still saves.
        setObjectUrl(null);
      });

    return () => {
      controller.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [path]);

  return objectUrl;
}
