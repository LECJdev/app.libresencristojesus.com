'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, MapIcon, Pencil, Plus, Trash2, UserRoundCheck } from 'lucide-react';
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
import { useLeadershipList } from '@/hooks/use-leadership-list';
import { useDeleteLeadershipUnit } from '@/hooks/use-leadership-crud';
import { useRoleId } from '@/hooks/use-role-id';
import { useDistricts } from '@/hooks/use-districts';
import { useResourceList } from '@/hooks/use-resource-list';
import { useSessionStore } from '@/store/session-store';
import { LeadershipFormDrawer } from '@/components/organization/leadership-form-drawer';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { toLeadershipEntityStatus } from '@/components/organization/mappers';
import { useResolvedCardLeaders } from '@/components/organization/use-resolved-photo';
import { resolveApiErrorMessage } from '@/lib/api-error-message';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Pastores de Distrito — the couples that lead a Distrito (doc06 §2, §3).
 *
 * A Pastor Distrito is a `LeadershipUnit` with the "Pastor Distrito" role,
 * same as a Líder is one with the "Líder" role — see decision #22 in
 * `Documentos/00_PROYECTO_MASTER.md`. Until now the only place that touched
 * these accounts was the District form's "Pareja pastoral" dropdown, which
 * can only ASSIGN an already-existing unit — there was no screen to create,
 * edit or remove one, unlike Pastores Generales and Líderes which each have
 * their own.
 *
 * WHERE THE ASSIGNMENT TO A DISTRICT HAPPENS
 * Not here. Assigning this couple to a Distrito is an edit of the DISTRICT
 * (`PATCH /districts/:id`), exactly like Líderes defers a Casa de Paz's
 * assignment to that house's own form. This screen only manages the
 * account itself.
 *
 * doc05 Matriz de Permisos: "Crear Distrito"/"Editar Distrito" are ✅ for
 * Administrador and Pastor General only (❌ for Pastor Distrito) — creating
 * or editing a Pastor Distrito account follows the same rule, since a
 * District Pastor manages their district's own data (Policy 2) but not the
 * roster of District Pastors itself.
 */
const ROLES_THAT_MANAGE: readonly RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_PASTOR];

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
 * Best-effort account identifier for display: the first member's username
 * (credentials are per-member now — see schema.prisma `LeadershipMember`),
 * falling back to the role label when no member has been registered yet.
 */
function accountLabel(unit: LeadershipUnit): string {
  return unit.members[0]?.username ?? ROLE_NAME_LABELS[unit.role];
}

/**
 * Its own component so `useResolvedCardLeaders` (two fixed `useStoredFilePreview`
 * calls per instance) runs once per card instead of inside the list's `.map` —
 * a variable number of hook calls per render would break the Rules of Hooks.
 */
function DistrictPastorListCard({
  unit,
  districtName,
  canManage,
  onEdit,
  onDelete,
}: {
  unit: LeadershipUnit;
  districtName: string | undefined;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const leaders = useResolvedCardLeaders(unit);

  return (
    <LeaderCard
      leaders={leaders ?? []}
      username={accountLabel(unit)}
      assignmentName={districtName}
      assignmentLabel="Distrito"
      assignmentIcon={MapIcon}
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

export default function PastoresDistritoPage() {
  const user = useSessionStore((state) => state.user);
  const canManage = user ? ROLES_THAT_MANAGE.includes(user.role) : false;
  const districtPastorRoleId = useRoleId(RoleName.DISTRICT_PASTOR);

  const list = useResourceList(
    { status: ALL },
    { defaultSort: { columnId: 'createdAt', direction: 'asc' } },
  );

  const [editing, setEditing] = useState<LeadershipUnit | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<LeadershipUnit | null>(null);

  const { data, isPending, isError, error } = useLeadershipList(RoleName.DISTRICT_PASTOR, {
    page: list.page,
    pageSize: list.pageSize,
    search: list.search || undefined,
    sort: list.sort.columnId,
    order: list.sort.direction,
    status: list.filters.status === ALL ? undefined : list.filters.status,
  });

  const deleteMutation = useDeleteLeadershipUnit();

  /**
   * Which Distrito each couple leads.
   *
   * One extra request rather than one per row, same reasoning as Líderes'
   * `houseByLeader`. Capped at 100 districts, comfortably above the
   * current scale.
   */
  const { data: districtsPage } = useDistricts({ page: 1, pageSize: 100 });
  const districtByLeader = useMemo(
    () =>
      new Map(
        (districtsPage?.data ?? [])
          .filter((district) => district.leadershipUnitId !== null)
          .map((district) => [district.leadershipUnitId as string, district.name]),
      ),
    [districtsPage],
  );

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Pastores de Distrito"
        description="Parejas pastorales de cada Distrito. Cada cuenta es compartida por los dos integrantes."
        actions={
          canManage ? (
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditing(undefined);
                setIsFormOpen(true);
              }}
            >
              Nueva pareja pastoral
            </Button>
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar los Pastores de Distrito"
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
              icon={UserRoundCheck}
              title={list.search ? 'Sin resultados' : 'Todavía no hay Pastores de Distrito'}
              description={
                list.search
                  ? `Ninguna pareja coincide con "${list.search}".`
                  : 'Registre la primera pareja pastoral para poder asignarla a un Distrito.'
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
                    Nueva pareja pastoral
                  </Button>
                ) : null
              }
            />
          ) : (
            <Grid>
              {(data?.data ?? []).map((unit) => (
                <GridItem key={unit.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                  <DistrictPastorListCard
                    unit={unit}
                    districtName={districtByLeader.get(unit.id)}
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
        <MapIcon className="size-4" aria-hidden="true" />
        La asignación de una pareja a su Distrito — y el reemplazo de una pareja por otra — se
        administra desde el módulo Distritos.
      </p>

      {canManage && districtPastorRoleId ? (
        <LeadershipFormDrawer
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          roleId={districtPastorRoleId}
          unitType={ROLE_NAME_LABELS[RoleName.DISTRICT_PASTOR]}
          memberLabels={['Pastor', 'Pastora']}
          title={editing ? 'Editar pareja pastoral' : 'Nueva pareja pastoral'}
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
        itemLabel="la pareja pastoral"
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
