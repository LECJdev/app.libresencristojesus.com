'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Input,
  Select,
  Textarea,
  useToast,
} from '@lcj/ui';
import type { MeetingReport } from '@lcj/types';
import { useUpdateMeetingReport } from '@/hooks/use-meeting-report';
import { useSermonThemes } from '@/hooks/use-sermon-themes';
import { SermonThemeFormDrawer } from './sermon-theme-form-drawer';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { QueuedOfflineError } from '@/lib/offline/with-offline-fallback';

/**
 * Tema, predicador y observaciones de la reunión (doc01 RF-022/023/024).
 *
 * Nothing here is required: the report is filled in over the course of the
 * week — the theme before the meeting, the preacher during it, the notes
 * afterwards — so the form saves whatever is present without demanding the
 * rest.
 *
 * `readOnly` covers two different situations that look the same to the
 * user: a role that only supervises (a pastor), and a week the lock has
 * already closed. The reason is explained above by the screen's own lock
 * banner, so this card only stops offering the edit.
 */

const NONE = '__none__';

/**
 * The API caps `pageSize` at 100, so this is the whole catalog in one call
 * as long as it stays under that — which it does for a list a church
 * maintains by hand. Past it, the select needs a search, not a bigger page.
 */
const THEME_PAGE_SIZE = 100;

const reportSchema = z.object({
  themeId: z.string().optional(),
  preacher: z.string().trim().max(200, 'Máximo 200 caracteres.').optional(),
  notes: z.string().trim().max(2000, 'Máximo 2000 caracteres.').optional(),
});

type ReportFormValues = z.input<typeof reportSchema>;

export interface MeetingReportCardProps {
  report: MeetingReport;
  readOnly: boolean;
}

export function MeetingReportCard({ report, readOnly }: MeetingReportCardProps) {
  const [isThemeFormOpen, setIsThemeFormOpen] = useState(false);
  const mutation = useUpdateMeetingReport(report.meetingId);
  const { toast } = useToast();

  // Only ACTIVE themes are offered: a theme retired from the catalog stays
  // attached to the meetings that used it, but must not be picked again.
  const { data: themesPage } = useSermonThemes({
    page: 1,
    pageSize: THEME_PAGE_SIZE,
    status: 'ACTIVE',
    sort: 'title',
    order: 'asc',
  });
  const themes = themesPage?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { themeId: NONE, preacher: '', notes: '' },
  });

  // Re-seeded from the server's response after every save, and whenever the
  // screen switches to another meeting.
  useEffect(() => {
    reset({
      themeId: report.themeId ?? NONE,
      preacher: report.preacher ?? '',
      notes: report.notes ?? '',
    });
  }, [report.meetingId, report.themeId, report.preacher, report.notes, reset]);

  const errorMessage = resolveApiErrorMessage(
    mutation.error,
    'No fue posible guardar el registro de la reunión.',
  );

  const themeOptions = [
    { value: NONE, label: 'Sin tema' },
    ...themes.map((theme) => ({
      value: theme.id,
      label: theme.series ? `${theme.series} · ${theme.title}` : theme.title,
    })),
  ];

  // A theme retired after this meeting was filed would otherwise vanish from
  // the select and read as "Sin tema" — the record must keep showing what
  // was actually taught.
  if (report.themeId && !themes.some((theme) => theme.id === report.themeId)) {
    themeOptions.push({
      value: report.themeId,
      label: report.themeTitle ? `${report.themeTitle} (inactivo)` : 'Tema inactivo',
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Registro de la reunión</CardTitle>
          <CardDescription>Tema, predicador y observaciones de la semana.</CardDescription>
        </div>
        {readOnly ? null : (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Plus}
            onClick={() => {
              setIsThemeFormOpen(true);
            }}
          >
            Nuevo tema
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {readOnly ? (
          <dl className="flex flex-col gap-3">
            <div className="flex flex-col">
              <dt className="text-caption text-foreground-muted">Tema</dt>
              <dd className="flex items-center gap-2 text-body text-foreground">
                <Icon icon={BookOpen} size="xs" className="text-foreground-muted" />
                {report.themeTitle ?? 'Sin registrar'}
                {report.themeSeries ? (
                  <span className="text-caption text-foreground-muted">({report.themeSeries})</span>
                ) : null}
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-caption text-foreground-muted">Predicó</dt>
              <dd className="text-body text-foreground">{report.preacher ?? 'Sin registrar'}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-caption text-foreground-muted">Observaciones</dt>
              <dd className="whitespace-pre-line text-body text-foreground">
                {report.notes ?? 'Sin observaciones'}
              </dd>
            </div>
          </dl>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                await mutation.mutateAsync({
                  // `null` is meaningful here and `undefined` is not: it is
                  // how the API is told to unlink a theme that was picked by
                  // mistake.
                  themeId: values.themeId === NONE ? null : values.themeId,
                  preacher: values.preacher?.trim() ?? '',
                  notes: values.notes?.trim() ?? '',
                });
              } catch (error) {
                if (error instanceof QueuedOfflineError) {
                  toast({
                    title: 'Guardado sin conexión',
                    description: error.message,
                    variant: 'warning',
                  });
                  mutation.reset();
                  // Marca el formulario como "no modificado": el dato ya
                  // quedó en la cola local, no tiene sentido seguir
                  // ofreciendo un reintento manual sobre lo mismo.
                  reset(values);
                }
                // Un error real de API deja `mutation.error` fijado y el
                // formulario sigue mostrando la alerta de abajo para
                // corregir y reintentar.
              }
            })}
          >
            {errorMessage ? (
              <p
                role="alert"
                className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
              >
                {errorMessage}
              </p>
            ) : null}

            <Controller
              control={control}
              name="themeId"
              render={({ field }) => (
                <Select
                  label="Tema"
                  options={themeOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />

            <Input
              label="Predicó"
              placeholder="Nombre de quien predicó"
              helperText="Texto libre: también predican invitados."
              error={errors.preacher?.message}
              {...register('preacher')}
            />

            <Textarea
              label="Observaciones"
              rows={3}
              helperText="Lo que valga la pena recordar de esta reunión."
              error={errors.notes?.message}
              {...register('notes')}
            />

            <div className="flex justify-end">
              <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
                Guardar registro
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      <SermonThemeFormDrawer
        open={isThemeFormOpen}
        onOpenChange={setIsThemeFormOpen}
        onCreated={(theme) => {
          // Selected straight away: the leader opened this form because they
          // needed THIS theme for THIS meeting.
          setValue('themeId', theme.id, { shouldDirty: true });
        }}
      />
    </Card>
  );
}
