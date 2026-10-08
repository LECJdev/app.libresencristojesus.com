'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Baby,
  CalendarCheck,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Container,
  EmptyState,
  EntityStatusBadge,
  Grid,
  GridItem,
  IconButton,
  KPICard,
  Loading,
  PageHeader,
  SkeletonCard,
} from '@lcj/ui';
import { RoleName, type KidsAssignment } from '@lcj/types';
import { useKidsSchool, useKidsAssignments, useRemoveKidsAssignment } from '@/hooks/use-kids-schools';
import { useKidsChildren } from '@/hooks/use-kids-children';
import { useKidsMetrics } from '@/hooks/use-kids-attendance';
import { useLeadershipUnitsByRole, leadershipUnitLabel } from '@/hooks/use-leadership-units';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { useSessionStore } from '@/store/session-store';
import { toEntityStatus } from '@/components/organization/mappers';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { KidsAttendanceTrend } from '@/components/kids/kids-attendance-trend';
import { KidsAssignmentFormDrawer } from '@/components/kids/kids-assignment-form-drawer';
import { KidsChildCard } from '@/components/kids/kids-child-card';
import { KidsChildFormDrawer } from '@/components/kids/kids-child-form-drawer';
import { KidsSchoolFormDrawer } from '@/components/kids/kids-school-form-drawer';
import { ApiError } from '@/lib/http-client';

const ROLE_LABELS: Record<KidsAssignment['role'], string> = {
  LEADER: 'Líder de sede',
  ASSISTANT: 'Auxiliar',
};

/** Only ADMIN administers `KidsSchool` itself (`kids-school:update`). */
const ROLES_THAT_MANAGE_SCHOOL: readonly RoleName[] = [RoleName.ADMIN];
/** ADMIN or the site's own KIDS_LEADER manage the team (`kids-assignment:create/delete`). */
const ROLES_THAT_MANAGE_TEAM: readonly RoleName[] = [RoleName.ADMIN, RoleName.KIDS_LEADER];

function AssignmentRow({
  assignment,
  name,
  photo,
  canRemove,
  onRemove,
}: {
  assignment: KidsAssignment;
  name: string;
  photo: string | null;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const photoSrc = useStoredFilePreview(photo);
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-4">
      <Avatar src={photoSrc ?? undefined} name={name} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body font-semibold text-foreground">{name}</p>
        <p className="truncate text-caption text-foreground-muted">
          {ROLE_LABELS[assignment.role]}
        </p>
      </div>
      {canRemove && assignment.role === 'ASSISTANT' ? (
        <IconButton
          icon={Trash2}
          aria-label={`Retirar a ${name}`}
          variant="ghost"
          size="sm"
          onClick={onRemove}
        />
      ) : null}
    </div>
  );
}

export default function KidsSchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);

  const canManageSchool = user ? ROLES_THAT_MANAGE_SCHOOL.includes(user.role) : false;
  const canManageTeam = user ? ROLES_THAT_MANAGE_TEAM.includes(user.role) : false;

  const { data: school, isPending: isSchoolPending, isError, error } = useKidsSchool(id);
  const { data: metrics, isPending: isMetricsPending } = useKidsMetrics(id);
  const { data: assignments } = useKidsAssignments(id);
  const { data: children, isPending: isChildrenPending } = useKidsChildren(id);

  const { data: leaderUnits } = useLeadershipUnitsByRole(RoleName.KIDS_LEADER);
  const { data: assistantUnits } = useLeadershipUnitsByRole(RoleName.KIDS_ASSISTANT);
  const unitNameById = useMemo(() => {
    const entries = [...(leaderUnits ?? []), ...(assistantUnits ?? [])].map(
      (unit) => [unit.id, leadershipUnitLabel(unit)] as const,
    );
    return new Map(entries);
  }, [leaderUnits, assistantUnits]);
  /** `members[0].photo` over `unit.photo`: every Kids demo account is a
   * single-member unit, so the member's own photo is the one meant to
   * represent them. */
  const unitPhotoById = useMemo(() => {
    const entries = [...(leaderUnits ?? []), ...(assistantUnits ?? [])].map(
      (unit) => [unit.id, unit.members[0]?.photo ?? unit.photo] as const,
    );
    return new Map(entries);
  }, [leaderUnits, assistantUnits]);

  const [isSchoolFormOpen, setIsSchoolFormOpen] = useState(false);
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [isChildFormOpen, setIsChildFormOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<KidsAssignment | null>(null);

  const removeMutation = useRemoveKidsAssignment();
  const removalError =
    removeMutation.error instanceof ApiError
      ? removeMutation.error.message
      : removeMutation.error
        ? 'No fue posible retirar al auxiliar.'
        : null;

  const activeAssignments = (assignments ?? []).filter((assignment) => assignment.endDate === null);

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title={school?.name ?? 'Sede de Escuela Kids'}
        actions={
          <div className="flex items-center gap-3">
            {school ? <EntityStatusBadge status={toEntityStatus(school.status)} /> : null}
            {canManageSchool ? (
              <Button
                variant="secondary"
                leftIcon={Pencil}
                onClick={() => {
                  setIsSchoolFormOpen(true);
                }}
              >
                Editar
              </Button>
            ) : null}
            <Button
              leftIcon={CalendarCheck}
              onClick={() => {
                router.push(`/kids/attendance?schoolId=${id}`);
              }}
            >
              Tomar asistencia
            </Button>
            <Button
              variant="ghost"
              leftIcon={ArrowLeft}
              onClick={() => {
                router.back();
              }}
            >
              Volver
            </Button>
          </div>
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar la sede"
          description={error.message}
        />
      ) : null}

      {isSchoolPending ? <Loading label="Cargando sede…" lines={6} /> : null}

      {school ? (
        <>
          <Grid>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
              <KPICard
                label="Niños activos"
                icon={Users}
                loading={isMetricsPending}
                value={metrics ? String(metrics.totalChildren) : '—'}
              />
            </GridItem>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
              <KPICard
                label="Presentes esta semana"
                icon={UserRoundCheck}
                loading={isMetricsPending}
                value={metrics ? `${metrics.present} de ${metrics.present + metrics.absent}` : '—'}
              />
            </GridItem>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
              <KPICard
                label="Asistencia promedio"
                icon={CalendarCheck}
                loading={isMetricsPending}
                value={metrics ? `${metrics.averageAttendance}%` : '—'}
              />
            </GridItem>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
              <KPICard
                label="Autorizaciones pendientes"
                icon={ShieldAlert}
                loading={isMetricsPending}
                value={metrics ? String(metrics.pendingConsents) : '—'}
              />
            </GridItem>
          </Grid>

          {metrics ? <KidsAttendanceTrend points={metrics.attendanceTrend} /> : null}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h4 font-semibold text-foreground">Equipo</h2>
              {canManageTeam ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => {
                    setIsAssignmentFormOpen(true);
                  }}
                >
                  Asignar
                </Button>
              ) : null}
            </div>

            {activeAssignments.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sin equipo asignado"
                description="Esta sede todavía no tiene líder ni auxiliares asignados."
              />
            ) : (
              <div className="grid gap-3 tablet:grid-cols-2">
                {activeAssignments.map((assignment) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    name={unitNameById.get(assignment.leadershipUnitId) ?? 'Sin nombre'}
                    photo={unitPhotoById.get(assignment.leadershipUnitId) ?? null}
                    canRemove={canManageTeam}
                    onRemove={() => {
                      removeMutation.reset();
                      setPendingRemoval(assignment);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h4 font-semibold text-foreground">Niños</h2>
              <Button
                size="sm"
                leftIcon={Plus}
                onClick={() => {
                  setIsChildFormOpen(true);
                }}
              >
                Nuevo niño
              </Button>
            </div>

            {isChildrenPending ? (
              <Grid>
                {Array.from({ length: 4 }, (_, index) => (
                  <GridItem key={index} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                    <SkeletonCard className="h-40" />
                  </GridItem>
                ))}
              </Grid>
            ) : (children?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Baby}
                title="Todavía no hay niños registrados"
                description="Registre al primer niño de esta sede para comenzar."
                action={
                  <Button
                    leftIcon={Plus}
                    onClick={() => {
                      setIsChildFormOpen(true);
                    }}
                  >
                    Nuevo niño
                  </Button>
                }
              />
            ) : (
              <Grid>
                {(children ?? []).map((child) => (
                  <GridItem key={child.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                    <KidsChildCard
                      child={child}
                      onClick={() => {
                        router.push(`/kids/children/${child.id}`);
                      }}
                    />
                  </GridItem>
                ))}
              </Grid>
            )}
          </section>
        </>
      ) : null}

      {canManageSchool ? (
        <KidsSchoolFormDrawer
          open={isSchoolFormOpen}
          onOpenChange={setIsSchoolFormOpen}
          school={school}
        />
      ) : null}

      {canManageTeam ? (
        <KidsAssignmentFormDrawer
          open={isAssignmentFormOpen}
          onOpenChange={setIsAssignmentFormOpen}
          schoolId={id}
          canAssignLeader={user?.role === RoleName.ADMIN}
        />
      ) : null}

      <KidsChildFormDrawer open={isChildFormOpen} onOpenChange={setIsChildFormOpen} schoolId={id} />

      <ConfirmDeleteModal
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoval(null);
          }
        }}
        itemLabel="al auxiliar"
        itemName={pendingRemoval ? unitNameById.get(pendingRemoval.leadershipUnitId) ?? '' : ''}
        loading={removeMutation.isPending}
        error={removalError}
        onConfirm={() => {
          if (!pendingRemoval) {
            return;
          }
          removeMutation.mutate(
            { schoolId: id, assignmentId: pendingRemoval.id },
            { onSuccess: () => setPendingRemoval(null) },
          );
        }}
      />
    </Container>
  );
}
