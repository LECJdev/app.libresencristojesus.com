'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCheck,
  Lock,
  LockOpen,
  Plus,
  Square,
  UsersRound,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Container,
  EmptyState,
  Icon,
  Loading,
  PageHeader,
  Select,
  cn,
  useToast,
} from '@lcj/ui';
import { RoleName, type AttendanceChecklist, type ChecklistRow } from '@lcj/types';
import {
  useCurrentMeeting,
  useMarkAll,
  useMarkAttendance,
  useRefreshAfterPersonCreated,
  useUnlockMeeting,
} from '@/hooks/use-attendance';
import { useMeetingReport } from '@/hooks/use-meeting-report';
import { usePeaceHouses } from '@/hooks/use-peace-houses';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { useSessionStore } from '@/store/session-store';
import { PersonFormDrawer } from '@/components/people/person-form-drawer';
import { UnlockMeetingModal } from '@/components/attendance/unlock-meeting-modal';
import { MeetingReportCard } from '@/components/meetings/meeting-report-card';
import { OfferingCard } from '@/components/meetings/offering-card';
import { MeetingPhotosCard } from '@/components/meetings/meeting-photos-card';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { QueuedOfflineError } from '@/lib/offline/with-offline-fallback';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Reunión semanal — the checklist a Líder fills after each meeting
 * (doc11 RN-407/RN-503/RN-504), followed by the report of what happened in
 * it: tema, ofrenda y fotografías (doc08 §32, doc01 RF-022..RF-026).
 *
 * ONE SCREEN, ONE MEETING. doc08 §32 draws the attendance list with
 * "💰 Ofrenda · 📸 Fotografías · 📝 Tema" right underneath it, and that is
 * the truth of the act being recorded: the leader fills all of it in the
 * same sitting, from a phone, minutes after the meeting ends. Splitting it
 * across modules would make them navigate four times to file one night.
 *
 * The sheet of the current ISO week is created on first access, so the
 * screen has no "create meeting" button: opening it IS opening the week.
 *
 * The lock state comes from the server on every response, and the UI only
 * reflects it. Deciding locally whether the week is closed would drift the
 * moment a reopening expired between two clicks.
 */

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const deadlineFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

function AttendanceRow({
  row,
  disabled,
  onToggle,
}: {
  row: ChecklistRow;
  disabled: boolean;
  onToggle: (present: boolean) => void;
}) {
  const photo = useStoredFilePreview(row.photo);
  const fullName = `${row.firstName} ${row.lastName}`.trim();

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-md border border-border px-3 py-2',
        row.present ? 'border-success-500 bg-success-50' : 'bg-surface',
      )}
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

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-foreground">{fullName}</span>
        {row.personStageName ? (
          <span className="truncate text-caption text-foreground-muted">{row.personStageName}</span>
        ) : null}
      </div>

      {row.comments ? (
        <span className="hidden max-w-40 truncate text-caption text-foreground-muted tablet:inline">
          {row.comments}
        </span>
      ) : null}
    </li>
  );
}

/** Explains the lock in the user's terms, and offers the way out when there is one. */
function LockBanner({
  checklist,
  canUnlock,
  onUnlock,
}: {
  checklist: AttendanceChecklist;
  canUnlock: boolean;
  onUnlock: () => void;
}) {
  const { lock } = checklist;

  if (lock.reason === 'current-week') {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-small text-foreground-muted">
        <Icon icon={LockOpen} size="xs" />
        Puede registrar la asistencia hasta el{' '}
        <strong className="text-foreground">
          {lock.editableUntil ? deadlineFormatter.format(new Date(lock.editableUntil)) : ''}
        </strong>
        . Al iniciar la próxima semana quedará bloqueada.
      </p>
    );
  }

  if (lock.reason === 'unlocked') {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-small text-warning-700">
        <Icon icon={LockOpen} size="xs" />
        Semana reabierta excepcionalmente hasta el{' '}
        <strong>
          {lock.unlockedUntil ? deadlineFormatter.format(new Date(lock.unlockedUntil)) : ''}
        </strong>
        . Los cambios quedan registrados en la auditoría.
      </p>
    );
  }

  if (lock.reason === 'role-exempt') {
    return (
      <p className="flex items-center gap-2 rounded-md border border-info-500 bg-info-50 px-4 py-3 text-small text-info-700">
        <Icon icon={LockOpen} size="xs" />
        Esta semana ya cerró para el líder. Usted puede editarla por su rol.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error-500 bg-error-50 px-4 py-3">
      <p className="flex items-center gap-2 text-small text-error-600">
        <Icon icon={Lock} size="xs" />
        La semana cerró y la asistencia está bloqueada.
        {canUnlock ? '' : ' Solicite a su Pastor de Distrito que la reabra.'}
      </p>
      {canUnlock ? (
        <Button variant="secondary" size="sm" leftIcon={LockOpen} onClick={onUnlock}>
          Reabrir
        </Button>
      ) : null}
    </div>
  );
}

/** doc11 RN-407: only these roles may reopen a closed week. */
const ROLES_THAT_UNLOCK: readonly RoleName[] = [RoleName.ADMIN, RoleName.DISTRICT_PASTOR];

/**
 * doc05: "Registrar Reunión" and "Registrar Ofrenda" are ✅ Administrador /
 * ✅ Líder only. The two pastor roles supervise the report, they do not fill
 * it in — so for them the cards below render as a read-only summary.
 */
const ROLES_THAT_REGISTER: readonly RoleName[] = [RoleName.ADMIN, RoleName.LEADER];

export default function ReunionesPage() {
  const user = useSessionStore((state) => state.user);
  const isLeader = user?.role === RoleName.LEADER;
  const canUnlock = user ? ROLES_THAT_UNLOCK.includes(user.role) : false;
  const canRegister = user ? ROLES_THAT_REGISTER.includes(user.role) : false;

  // A Líder only ever registers their own Casa de Paz, so the list is
  // narrowed to theirs and preselected — one less decision on a phone,
  // mid-meeting.
  const { data: housesPage } = usePeaceHouses({
    page: 1,
    pageSize: 100,
    ...(isLeader && user ? { leadershipUnitId: user.id } : {}),
  });
  const peaceHouses = useMemo(() => housesPage?.data ?? [], [housesPage]);

  const [peaceHouseId, setPeaceHouseId] = useState<string | undefined>(undefined);
  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);

  useEffect(() => {
    if (!peaceHouseId && peaceHouses.length > 0) {
      setPeaceHouseId(peaceHouses[0]!.id);
    }
  }, [peaceHouses, peaceHouseId]);

  const { data: checklist, isPending, isError, error } = useCurrentMeeting(peaceHouseId);
  // Chained on purpose: the report is keyed by `meetingId`, which only
  // exists once the week has been opened by the checklist above.
  const { data: report } = useMeetingReport(checklist?.meetingId);
  const markMutation = useMarkAttendance(peaceHouseId);
  const markAllMutation = useMarkAll(peaceHouseId);
  const unlockMutation = useUnlockMeeting(peaceHouseId);
  const refreshAfterPerson = useRefreshAfterPersonCreated(peaceHouseId);
  const { toast } = useToast();

  const editable = checklist?.lock.editable ?? false;
  const isBusy = markMutation.isPending || markAllMutation.isPending;

  // Un `QueuedOfflineError` ya se avisa con un toast (ver los `onError` de
  // abajo) — mostrarlo también acá diría "no fue posible guardar" sobre un
  // cambio que en realidad sí quedó capturado, solo que en la cola local.
  const markError = markMutation.error instanceof QueuedOfflineError ? null : markMutation.error;
  const markAllError =
    markAllMutation.error instanceof QueuedOfflineError ? null : markAllMutation.error;
  const writeError = resolveApiErrorMessage(
    markError ?? markAllError,
    'No fue posible guardar el cambio.',
  );

  function notifyQueuedOffline(error: unknown): void {
    if (error instanceof QueuedOfflineError) {
      toast({ title: 'Guardado sin conexión', description: error.message, variant: 'warning' });
    }
  }

  return (
    <Container size="md" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Reunión de la semana"
        description="Asistencia, tema, ofrenda y fotografías de la Casa de Paz."
        actions={
          checklist && editable ? (
            <Button
              variant="secondary"
              leftIcon={Plus}
              onClick={() => {
                setIsPersonFormOpen(true);
              }}
            >
              Nueva persona
            </Button>
          ) : null
        }
      />

      {peaceHouses.length > 1 ? (
        <Select
          label="Casa de Paz"
          options={peaceHouses.map((house) => ({ value: house.id, label: house.name }))}
          value={peaceHouseId ?? ''}
          onValueChange={setPeaceHouseId}
        />
      ) : null}

      {peaceHouses.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No hay una Casa de Paz asignada"
          description="La asistencia se registra sobre una Casa de Paz. Solicite al administrador que le asigne una."
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

          <LockBanner
            checklist={checklist}
            canUnlock={canUnlock}
            onUnlock={() => {
              unlockMutation.reset();
              setIsUnlockOpen(true);
            }}
          />

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
              title="Esta Casa de Paz aún no tiene personas"
              description="Registre a la primera persona para poder tomar asistencia."
              action={
                editable ? (
                  <Button
                    leftIcon={Plus}
                    onClick={() => {
                      setIsPersonFormOpen(true);
                    }}
                  >
                    Nueva persona
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={CheckCheck}
                  disabled={!editable || isBusy}
                  onClick={() => {
                    markAllMutation.mutate(
                      { meetingId: checklist.meetingId, present: true },
                      { onError: notifyQueuedOffline },
                    );
                  }}
                >
                  Marcar todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Square}
                  disabled={!editable || isBusy}
                  onClick={() => {
                    markAllMutation.mutate(
                      { meetingId: checklist.meetingId, present: false },
                      { onError: notifyQueuedOffline },
                    );
                  }}
                >
                  Desmarcar todos
                </Button>
              </div>

              <ul className="flex flex-col gap-2">
                {checklist.rows.map((row) => (
                  <AttendanceRow
                    key={row.personId}
                    row={row}
                    disabled={!editable || isBusy}
                    onToggle={(present) => {
                      markMutation.mutate(
                        {
                          meetingId: checklist.meetingId,
                          personId: row.personId,
                          present,
                        },
                        { onError: notifyQueuedOffline },
                      );
                    }}
                  />
                ))}
              </ul>
            </>
          )}

          {/*
            The report of the same meeting. It renders only once loaded so
            the sheet — the urgent part — is usable while the rest arrives,
            and it reads its OWN lock rather than the checklist's: both come
            from the same server rule, and trusting the copy at hand is how
            two panels on one screen start disagreeing.
          */}
          {report ? (
            <div className="flex flex-col gap-4">
              <MeetingReportCard report={report} readOnly={!canRegister || !report.lock.editable} />
              <OfferingCard report={report} readOnly={!canRegister || !report.lock.editable} />
              <MeetingPhotosCard report={report} readOnly={!canRegister || !report.lock.editable} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/*
        "Crear persona durante la asistencia" reuses the Personas form
        wholesale — a second, simplified form would drift from the real one
        the first time a field changed.
      */}
      {peaceHouseId ? (
        <PersonFormDrawer
          open={isPersonFormOpen}
          onOpenChange={(open) => {
            setIsPersonFormOpen(open);
            if (!open) {
              void refreshAfterPerson();
            }
          }}
          peaceHouses={peaceHouses}
          defaultPeaceHouseId={peaceHouseId}
        />
      ) : null}

      <UnlockMeetingModal
        open={isUnlockOpen}
        onOpenChange={setIsUnlockOpen}
        loading={unlockMutation.isPending}
        error={resolveApiErrorMessage(unlockMutation.error, 'No fue posible reabrir la semana.')}
        onConfirm={(reason) => {
          if (!checklist) {
            return;
          }
          unlockMutation.mutate(
            { meetingId: checklist.meetingId, reason },
            { onSuccess: () => setIsUnlockOpen(false) },
          );
        }}
      />
    </Container>
  );
}
