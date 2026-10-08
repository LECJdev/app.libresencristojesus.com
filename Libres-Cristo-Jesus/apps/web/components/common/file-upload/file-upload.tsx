'use client';

import { useCallback, useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { ImageUp, Trash2, UploadCloud, X } from 'lucide-react';
import { Button, Icon, IconButton, cn } from '@lcj/ui';
import { acceptAttributeFor, maxUploadMegabytes, type StorageCategory } from '@lcj/types';
import { useFileUpload, useStoredFilePreview } from '@/hooks/use-file-upload';

/**
 * The ONLY way to upload a file from the frontend.
 *
 * Every image field in the product — church logo, pastor and pastora
 * photographs, leader portraits, attendee and event pictures — uses this
 * component. Nothing else calls `POST /files/upload` directly, so the
 * upload contract, the validation messages and the progress behaviour are
 * defined once.
 *
 * CONTRACT
 * It is a controlled field over a STORED PATH, not over a `File`. The
 * parent holds `value: string | null` (the path the API returned) and
 * receives `onChange(path)`. That mirrors what the entity actually
 * persists (doc04 §15) and keeps the parent form free of upload state.
 *
 * The upload happens on selection, not on submit: by the time the user
 * presses "Guardar", the path already exists and saving is a plain JSON
 * PATCH. Deferring it would mean every form re-implementing multipart.
 */
export interface FileUploadProps {
  /** Decides the allowed MIME types and the size ceiling. */
  category: StorageCategory;
  /** Currently stored path, or null. */
  value: string | null;
  /** Fires with the new path, or null when cleared. */
  onChange: (path: string | null) => void;
  label: string;
  helperText?: string;
  /** Validation message from the surrounding form. */
  error?: string;
  disabled?: boolean;
  /** Preview shape. Photographs of people read better as a circle. */
  shape?: 'square' | 'circle';
}

export function FileUpload({
  category,
  value,
  onChange,
  label,
  helperText,
  error,
  disabled = false,
  shape = 'square',
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const { status, progress, error: uploadError, upload, cancel, reset } = useFileUpload(category);
  const storedPreview = useStoredFilePreview(localPreview ? null : value);

  // The just-picked file previews instantly from memory; only an
  // already-stored path needs a round trip. Revoked on replacement so the
  // blob is not pinned for the life of the page.
  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const handleFile = useCallback(
    async (file: File) => {
      setLocalPreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }
        return URL.createObjectURL(file);
      });

      const stored = await upload(file);
      if (stored) {
        onChange(stored.path);
      } else {
        // Rejected or cancelled: drop the optimistic preview so the field
        // never shows an image the server does not have.
        setLocalPreview((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return null;
        });
      }
    },
    [onChange, upload],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) {
        return;
      }
      const [file] = Array.from(event.dataTransfer.files);
      if (file) {
        void handleFile(file);
      }
    },
    [disabled, handleFile],
  );

  const clear = useCallback(() => {
    setLocalPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    reset();
    onChange(null);
    if (inputRef.current) {
      // Without this, re-picking the SAME file fires no change event.
      inputRef.current.value = '';
    }
  }, [onChange, reset]);

  const preview = localPreview ?? storedPreview;
  const isBusy = status === 'uploading' || status === 'validating';
  const message = error ?? uploadError;

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={inputId} className="text-small font-medium">
        {label}
      </label>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => {
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-md border border-dashed p-4',
          'transition-colors duration-fast',
          isDragging ? 'border-primary-600 bg-primary-50' : 'border-border bg-surface',
          message && 'border-error-500',
          disabled && 'opacity-60',
        )}
      >
        {preview ? (
          <div className="relative">
            {/*
              A plain <img>, not next/image: the source is a blob: URL
              created at runtime, which the Next.js optimiser cannot
              process and would reject.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Vista previa de ${label}`}
              className={cn(
                'size-28 object-cover',
                shape === 'circle' ? 'rounded-full' : 'rounded-md',
              )}
            />
            {!disabled && !isBusy ? (
              <IconButton
                icon={Trash2}
                aria-label={`Quitar ${label}`}
                variant="secondary"
                size="sm"
                className="absolute -right-2 -top-2"
                onClick={clear}
              />
            ) : null}
          </div>
        ) : (
          <span className="flex size-28 items-center justify-center rounded-md bg-surface-muted text-foreground-muted">
            <Icon icon={ImageUp} size="lg" />
          </span>
        )}

        {isBusy ? (
          <div className="flex w-full max-w-xs flex-col gap-2">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label={`Subiendo ${label}`}
              className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className="h-full bg-primary-600 transition-[width] duration-fast"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-foreground-muted">
                {status === 'validating' ? 'Validando…' : `${Math.round(progress * 100)} %`}
              </span>
              <Button variant="ghost" size="sm" leftIcon={X} onClick={cancel}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={UploadCloud}
            disabled={disabled}
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            {preview ? 'Cambiar archivo' : 'Seleccionar archivo'}
          </Button>
        )}

        <p className="text-center text-caption text-foreground-muted">
          Arrastre un archivo aquí o selecciónelo. Máximo {maxUploadMegabytes(category)} MB.
        </p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={acceptAttributeFor(category)}
        disabled={disabled}
        onChange={(event) => {
          const [file] = Array.from(event.target.files ?? []);
          if (file) {
            void handleFile(file);
          }
        }}
      />

      {message ? (
        <p role="alert" className="text-caption text-error-600">
          {message}
        </p>
      ) : helperText ? (
        <p className="text-caption text-foreground-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
