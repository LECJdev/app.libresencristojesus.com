'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Baby, CheckCheck, Square, UsersRound } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Container,
  EmptyState,
  Loading,
  PageHeader,
  Select,
} from '@lcj/ui';
import type { KidsChecklistRow } from '@lcj/types';
import { useKidsSchools } from '@/hooks/use-kids-schools';
import {
  useCurrentKidsMeeting,
  useMarkAllKidsAttendance,
  useMarkKidsAttendance,
  useUnmarkAllKidsAttendance,
} from '@/hooks/use-kids-attendance';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Asistencia semanal de Escuela Kids — mismo patrón de `/reuniones` (una
 * sola pantalla, la semana ISO vigente se abre sola), sin bloqueo semanal ni
 * cola offline: `kids-attendance` nunca implementó ninguno de los dos
 * (`prisma/schema.prisma`'s `KidsMeeting` no lleva lock fields, y el backend
 * de sync solo conoce las operaciones de Casas de Paz — ver
 * `lib/api/kids-attendance.ts`).
 */

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function KidsAttendanceRow({
  row,
  disabled,
  onToggle,
}: {
  row: KidsChecklistRow;
  disabled: boolean;
  onToggle: (present: boolean) => void;
}) {
  const photo = useStoredFilePreview(row.photo);
  const fullName = `${row.firstName} ${row.lastName}`.trim();

  return (
    <li
      className={`flex items-center gap-3 rounded-md border border-border px-3 py-2 ${
        row.present ? 'border-success-500 bg-success-50' : 'bg-surface'
      }`}
    >
      <Checkbox
        checked={row.present}
        disabled={disabled}
        aria-label={`Marcar a ${fullName} como presente`}
        onCheckedChange={(checked) => {
          onToggle(checked === true);
        }}
      />
      <Avatar src={photo ?? undefined} name={fullName} size="sm" />
      <span className="min-w-0 flex-1 truncate text-body font-medium text-foreground">
        {fullName}
      </span>
    </li>
  );
}

export default function KidsAttendancePage() {
  return (
    <Suspense
      fallback={
        <Container size="md" className="pb-8">
          <Loading label="Cargando…" lines={6} />
        </Container>
      }
    >
      <KidsAttendanceContent />
    </Suspense>
  );
}

function KidsAttendanceContent() {
  const searchParams = useSearchParams();
  const preselectedSchoolId = searchParams.get('schoolId') ?? undefined;

  const { data: schools } = useKidsSchools();
  const [schoolId, setSchoolId] = useState<string | undefined>(preselectedSchoolId);

  useEffect(() => {
    if (!schoolId && schools && schools.length > 0) {
      setSchoolId(preselectedSchoolId ?? schools[0]!.id);
    }
  }, [schools, schoolId, preselectedSchoolId]);

  const { data: checklist, isPending, isError, error } = useCurrentKidsMeeting(schoolId);
  const markMutation = useMarkKidsAttendance(schoolId);
  const markAllMutation = useMarkAllKidsAttendance(schoolId);
  const unmarkAllMutation = useUnmarkAllKidsAttendance(schoolId);

  const isBusy = markMutation.isPending || markAllMutation.isPending || unmarkAllMutation.isPending;
  const writeError = resolveApiErrorMessage(
    markMutation.error ?? markAllMutation.error ?? unmarkAllMutation.error,
    'No fue posible guardar el cambio.',
  );

  const schoolOptions = useMemo(
    () => (schools ?? []).map((school) => ({ value: school.id, label: school.name })),
    [schools],
  );

  return (
    <Container size="md" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Asistencia Escuela Kids"
        description="Asistencia de la reunión de la semana."
      />

      {schoolOptions.length > 1 ? (
        <Select
          label="Sede"
          options={schoolOptions}
          value={schoolId ?? ''}
          onValueChange={setSchoolId}
        />
      ) : null}

      {(schools?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Baby}
          title="No hay una sede asignada"
          description="La asistencia se registra sobre una sede de Escuela Kids. Solicite al administrador que le asigne una."
        />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible abrir la asistencia"
          description={error.message}
        />
      ) : isPending ? (
        <Loading label="Abriendo la reunión de esta semana…" lines={6} />
      ) : checklist ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-caption text-foreground-muted">
                Semana ISO {checklist.isoWeek} · {checklist.isoYear}
              </span>
              <span className="text-body font-semibold capitalize text-foreground">
                {dateFormatter.format(new Date(checklist.meetingDate))}
              </span>
            </div>
            <Badge variant={checklist.presentCount > 0 ? 'success' : 'neutral'}>
              {checklist.presentCount} de {checklist.rows.length} presentes
            </Badge>
          </div>

          {writeError ? (
            <p
              role="alert"
              className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
            >
              {writeError}
            </p>
          ) : null}

          {checklist.rows.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Esta sede aún no tiene niños"
              description="Registre al primer niño desde el detalle de la sede para poder tomar asistencia."
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={CheckCheck}
                  disabled={isBusy}
                  onClick={() => {
                    markAllMutation.mutate({ meetingId: checklist.meetingId });
                  }}
                >
                  Marcar todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Square}
                  disabled={isBusy}
                  onClick={() => {
                    unmarkAllMutation.mutate({ meetingId: checklist.meetingId });
                  }}
                >
                  Desmarcar todos
                </Button>
              </div>

              <ul className="flex flex-col gap-2">
                {checklist.rows.map((row) => (
                  <KidsAttendanceRow
                    key={row.childId}
                    row={row}
                    disabled={isBusy}
                    onToggle={(present) => {
                      markMutation.mutate({
                        meetingId: checklist.meetingId,
                        childId: row.childId,
                        present,
                      });
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </Container>
  );
}
