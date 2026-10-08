'use client';

import { useState } from 'react';
import { Eye, EyeOff, ImageIcon, Pencil } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  IconButton,
  Input,
  cn,
  useToast,
} from '@lcj/ui';
import type { MeetingPhoto, MeetingReport } from '@lcj/types';
import { FileUpload } from '@/components/common/file-upload';
import { useAddMeetingPhoto, useUpdateMeetingPhoto } from '@/hooks/use-meeting-report';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { QueuedOfflineError } from '@/lib/offline/with-offline-fallback';

/**
 * Fotografías de la reunión (doc01 RF-025, doc02 RN-043/RN-044).
 *
 * The upload and the attachment are two separate steps by design: the file
 * reaches storage through the shared `FileUpload` (the only component that
 * calls `POST /files/upload`), and this card then sends the RESULTING PATH
 * to `POST /meetings/:id/photos`. The API never receives a binary.
 *
 * NOTHING IS EVER DELETED HERE. RN-044 hides a photograph from the gallery
 * and keeps both the record and the file, so a picture taken down by
 * mistake can be restored — which is why the control reads "Ocultar" and
 * not "Eliminar".
 */

function PhotoTile({
  photo,
  readOnly,
  onToggleHidden,
  onEditCaption,
  busy,
}: {
  photo: MeetingPhoto;
  readOnly: boolean;
  onToggleHidden: () => void;
  onEditCaption: () => void;
  busy: boolean;
}) {
  const preview = useStoredFilePreview(photo.path);

  return (
    <li
      className={cn(
        'flex flex-col overflow-hidden rounded-md border border-border bg-surface',
        photo.hidden && 'opacity-60',
      )}
    >
      <div className="relative aspect-video w-full bg-surface-muted">
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview}
            alt={photo.caption ?? 'Fotografía de la reunión'}
            className="size-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-caption text-foreground-muted">
          {photo.caption ?? 'Sin descripción'}
          {photo.hidden ? ' · oculta' : ''}
        </span>
        {readOnly ? null : (
          <>
            <IconButton
              icon={Pencil}
              aria-label="Editar descripción"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onEditCaption}
            />
            <IconButton
              icon={photo.hidden ? Eye : EyeOff}
              aria-label={photo.hidden ? 'Mostrar en la galería' : 'Ocultar de la galería'}
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onToggleHidden}
            />
          </>
        )}
      </div>
    </li>
  );
}

export interface MeetingPhotosCardProps {
  report: MeetingReport;
  readOnly: boolean;
}

export function MeetingPhotosCard({ report, readOnly }: MeetingPhotosCardProps) {
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');

  const addMutation = useAddMeetingPhoto(report.meetingId);
  const updateMutation = useUpdateMeetingPhoto(report.meetingId);
  const { toast } = useToast();

  // Un `QueuedOfflineError` de `addMutation` ya se avisa con un toast (ver
  // más abajo), así que no debe repetirse como la alerta genérica de error.
  const addError = addMutation.error instanceof QueuedOfflineError ? null : addMutation.error;
  const errorMessage = resolveApiErrorMessage(
    addError ?? updateMutation.error,
    'No fue posible guardar la fotografía.',
  );

  // A pastor consulting a report with no pictures gets nothing to look at
  // and no upload field either, so the card would be an empty box.
  if (readOnly && report.photos.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotografías</CardTitle>
        <CardDescription>
          Memoria gráfica de la reunión. Ocultar una foto no la elimina.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
          >
            {errorMessage}
          </p>
        ) : null}

        {report.photos.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="Todavía no hay fotografías"
            description="Suba la primera imagen de la reunión."
          />
        ) : (
          <ul className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
            {report.photos.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                readOnly={readOnly}
                busy={updateMutation.isPending}
                onEditCaption={() => {
                  updateMutation.reset();
                  setEditingPhotoId(photo.id);
                  setEditingCaption(photo.caption ?? '');
                }}
                onToggleHidden={() => {
                  updateMutation.mutate({
                    photoId: photo.id,
                    input: { hidden: !photo.hidden },
                  });
                }}
              />
            ))}
          </ul>
        )}

        {editingPhotoId ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-3">
            <Input
              label="Descripción de la fotografía"
              value={editingCaption}
              maxLength={200}
              onChange={(event) => {
                setEditingCaption(event.target.value);
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingPhotoId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={updateMutation.isPending}
                onClick={() => {
                  updateMutation.mutate(
                    { photoId: editingPhotoId, input: { caption: editingCaption.trim() } },
                    { onSuccess: () => setEditingPhotoId(null) },
                  );
                }}
              >
                Guardar descripción
              </Button>
            </div>
          </div>
        ) : null}

        {readOnly ? null : (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <FileUpload
              category="meeting-photo"
              label="Nueva fotografía"
              helperText="Se adjunta a la reunión al pulsar Agregar."
              value={pendingPath}
              onChange={setPendingPath}
            />

            <Input
              label="Descripción"
              placeholder="Momento de oración"
              maxLength={200}
              value={caption}
              onChange={(event) => {
                setCaption(event.target.value);
              }}
            />

            <div className="flex justify-end">
              <Button
                loading={addMutation.isPending}
                disabled={!pendingPath}
                onClick={() => {
                  if (!pendingPath) {
                    return;
                  }
                  addMutation.mutate(
                    {
                      path: pendingPath,
                      caption: caption.trim() || undefined,
                      // Appended at the end of the gallery, in the order the
                      // meeting actually happened.
                      sortOrder: report.photos.length,
                    },
                    {
                      onSuccess: () => {
                        setPendingPath(null);
                        setCaption('');
                      },
                      onError: (error) => {
                        if (error instanceof QueuedOfflineError) {
                          // El adjunto ya quedó en la cola local: se limpia
                          // el formulario igual que en un guardado exitoso.
                          toast({
                            title: 'Guardado sin conexión',
                            description: error.message,
                            variant: 'warning',
                          });
                          addMutation.reset();
                          setPendingPath(null);
                          setCaption('');
                        }
                      },
                    },
                  );
                }}
              >
                Agregar fotografía
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
