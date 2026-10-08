'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, House, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import {
  Button,
  Container,
  DataTableToolbar,
  EmptyState,
  Grid,
  GridItem,
  IconButton,
  LeaderCard,
  PageHeader,
  Pagination,
  Select,
  SkeletonCard,
} from '@lcj/ui';
import {
  ROLE_NAME_LABELS,
  RoleName,
  type LeadershipUnit,
  type LeadershipUnitStatus,
} from '@lcj/types';

/**
 * Best-effort account identifier for display: the first member's username
 * (credentials are per-member now — see schema.prisma `LeadershipMember`),
 * falling back to the role label when no member has been registered yet.
 */
function accountLabel(unit: LeadershipUnit): string {
  return unit.members[0]?.username ?? ROLE_NAME_LABELS[unit.role];
}
import { useLeadershipList } from '@/hooks/use-leadership-list';
import { useDeleteLeadershipUnit } from '@/hooks/use-leadership-crud';
import { useRoleId } from '@/hooks/use-role-id';
import { usePeaceHouses } from '@/hooks/use-peace-houses';
import { useResourceList } from '@/hooks/use-resource-list';
import { useSessionStore } from '@/store/session-store';
import { LeadershipFormDrawer } from '@/components/organization/leadership-form-drawer';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { toLeadershipEntityStatus } from '@/components/organization/mappers';
import { useResolvedCardLeaders } from '@/components/organization/use-resolved-photo';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Líderes — the couples that lead a Casa de Paz (doc06 §3, doc07).
 *
 * A Líder is a `LeadershipUnit` with the "Líder" role: two people, one
 * shared account. There is no separate backend resource — see decision #22
 * in `Documentos/00_PROYECTO_MASTER.md`.
 *
 * WHERE "CAMBIO DE LIDERAZGO" ACTUALLY HAPPENS
 * Not here. Reassigning a Casa de Paz to a different couple is an edit of
 * the HOUSE (`PATCH /peace-houses/:id`), which closes the open history
 * period and opens the next one in one transaction. Offering a second way
 * to do it from this screen would create a path that bypasses that
 * bookkeeping — so this screen shows the assignment and links to it.
 *
 * doc05 Matriz de Permisos: "Crear Usuario Líder" ✅ for Administrador,
 * Pastor General and Pastor Distrito; ❌ for Líder.
 */
const ROLES_THAT_MANAGE: readonly RoleName[] = [
  RoleName.ADMIN,
  RoleName.GENERAL_PASTOR,
  RoleName.DISTRICT_PASTOR,
];

const ALL = '__all__';

const STATUS_LABELS: Record<LeadershipUnitStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
  RETIRED: 'Retirado',
};

/** The couple, joined the way Spanish reads them. */
function coupleName(unit: LeadershipUnit): string {
  if (unit.members.length === 0) {
    return ROLE_NAME_LABELS[unit.role];
  }
  return unit.members.map((member) => `${member.firstName} ${member.lastName}`.trim()).join(' y ');
}

/**
 * Its own component so `useResolvedCardLeaders` (two fixed `useStoredFilePreview`
 * calls per instance) runs once per card instead of inside the list's `.map` —
 * a variable number of hook calls per render would break the Rules of Hooks.
 */
function LeaderListCard({
  unit,
  peaceHouseName,
  canManage,
  onEdit,
  onDelete,
}: {
  unit: LeadershipUnit;
  peaceHouseName: string | undefined;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const leaders = useResolvedCardLeaders(unit);

  return (
    <LeaderCard
      leaders={leaders ?? []}
      username={accountLabel(unit)}
      assignmentName={peaceHouseName}
      phone={unit.members.find((member) => member.phone)?.phone ?? undefined}
      email={unit.members.find((member) => member.email)?.email ?? undefined}
      status={toLeadershipEntityStatus(unit.status)}
      actions={
        canManage ? (
          <>
            <IconButton
              icon={Pencil}
              aria-label={`Editar ${accountLabel(unit)}`}
              variant="ghost"
              size="sm"
              onClick={onEdit}
            />
            <IconButton
              icon={Trash2}
              aria-label={`Eliminar ${accountLabel(unit)}`}
              variant="ghost"
              size="sm"
              onClick={onDelete}
            />
          </>
        ) : null
      }
    />
  );
}

export default function LideresPage() {
  const user = useSessionStore((state) => state.user);
  const canManage = user ? ROLES_THAT_MANAGE.includes(user.role) : false;
  const leaderRoleId = useRoleId(RoleName.LEADER);

  const list = useResourceList(
    { status: ALL },
    { defaultSort: { columnId: 'createdAt', direction: 'asc' } },
  );

  const [editing, setEditing] = useState<LeadershipUnit | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<LeadershipUnit | null>(null);

  const { data, isPending, isError, error } = useLeadershipList(RoleName.LEADER, {
    page: list.page,
    pageSize: list.pageSize,
    search: list.search || undefined,
    sort: list.sort.columnId,
    order: list.sort.direction,
    status: list.filters.status === ALL ? undefined : list.filters.status,
  });

  const deleteMutation = useDeleteLeadershipUnit();

  /**
   * Which Casa de Paz each couple leads.
   *
   * One extra request rather than one per row: asking the API per leader
   * would be an N+1 on every page render. Capped at 100 houses, which
   * covers the current scale — see risk #1 in the master document for when
   * this needs revisiting.
   */
  const { data: peaceHousesPage } = usePeaceHouses({ page: 1, pageSize: 100 });
  const houseByLeader = useMemo(
    () =>
      new Map((peaceHousesPage?.data ?? []).map((house) => [house.leadershipUnitId, house.name])),
    [peaceHousesPage],
  );

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Líderes"
        description="Parejas líderes de las Casas de Paz. Cada cuenta es compartida por los dos integrantes."
        actions={
          canManage ? (
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditing(undefined);
                setIsFormOpen(true);
              }}
            >
              Nueva pareja líder
            </Button>
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar los líderes"
          description={error.message}
        />
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Buscar por usuario…"
            filters={
              <Select
                label="Estado"
                options={[
                  { value: ALL, label: 'Todos los estados' },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
                value={list.filters.status}
                onValueChange={(value) => {
                  list.setFilter('status', value);
                }}
              />
            }
            columnOptions={[]}
            hiddenColumnIds={[]}
            onToggleColumn={() => {}}
            showColumnsMenu={false}
          />

          {isPending ? (
            <Grid>
              {Array.from({ length: list.pageSize }, (_, index) => (
                <GridItem key={index} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                  <SkeletonCard className="h-56" />
                </GridItem>
              ))}
            </Grid>
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={UsersRound}
              title={list.search ? 'Sin resultados' : 'Todavía no hay parejas líderes'}
              description={
                list.search
                  ? `Ninguna pareja coincide con "${list.search}".`
                  : 'Registre la primera pareja líder para poder asignarle una Casa de Paz.'
              }
              action={
                canManage && !list.search ? (
                  <Button
                    leftIcon={Plus}
                    onClick={() => {
                      setEditing(undefined);
                      setIsFormOpen(true);
                    }}
                  >
                    Nueva pareja líder
                  </Button>
                ) : null
              }
            />
          ) : (
            <Grid>
              {(data?.data ?? []).map((unit) => (
                <GridItem key={unit.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                  <LeaderListCard
                    unit={unit}
                    peaceHouseName={houseByLeader.get(unit.id)}
                    canManage={canManage}
                    onEdit={() => {
                      setEditing(unit);
                      setIsFormOpen(true);
                    }}
                    onDelete={() => {
                      deleteMutation.reset();
                      setPendingDeletion(unit);
                    }}
                  />
                </GridItem>
              ))}
            </Grid>
          )}

          {data && data.meta.total > 0 ? (
            <Pagination
              page={data.meta.page}
              pageSize={data.meta.pageSize}
              total={data.meta.total}
              onPageChange={list.setPage}
              onPageSizeChange={list.setPageSize}
            />
          ) : null}
        </div>
      )}

      <p className="flex items-center gap-2 text-caption text-foreground-muted">
        <House className="size-4" aria-hidden="true" />
        La asignación de una pareja a su Casa de Paz — y el historial de cada cambio — se administra
        desde el módulo Casas de Paz.
      </p>

      {canManage && leaderRoleId ? (
        <LeadershipFormDrawer
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          roleId={leaderRoleId}
          unitType={ROLE_NAME_LABELS[RoleName.LEADER]}
          memberLabels={['Líder', 'Lídera']}
          title={editing ? 'Editar pareja líder' : 'Nueva pareja líder'}
          description="Una sola cuenta de acceso compartida por la pareja. Cada integrante conserva su fotografía y sus datos de contacto."
          unit={editing}
        />
      ) : null}

      <ConfirmDeleteModal
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeletion(null);
          }
        }}
        itemLabel="la pareja líder"
        itemName={pendingDeletion ? coupleName(pendingDeletion) : ''}
        loading={deleteMutation.isPending}
        error={resolveApiErrorMessage(deleteMutation.error, 'No fue posible eliminar la cuenta.')}
        onConfirm={() => {
          if (!pendingDeletion) {
            return;
          }
          deleteMutation.mutate(pendingDeletion.id, {
            onSuccess: () => {
              setPendingDeletion(null);
            },
          });
        }}
      />
    </Container>
  );
}
