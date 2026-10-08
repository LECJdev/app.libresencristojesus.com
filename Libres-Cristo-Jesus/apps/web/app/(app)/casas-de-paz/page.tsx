'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, Home, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Container,
  DataTableToolbar,
  EmptyState,
  Grid,
  GridItem,
  IconButton,
  PageHeader,
  Pagination,
  PeaceHouseCard,
  Select,
  SkeletonCard,
} from '@lcj/ui';
import { RoleName, type PeaceHouseNode, type PeaceHouse } from '@lcj/types';
import { useDeletePeaceHouse, usePeaceHouses } from '@/hooks/use-peace-houses';
import { useDistricts } from '@/hooks/use-districts';
import { useDepartments } from '@/hooks/use-geography';
import { useOrganizationTree } from '@/hooks/use-organization-tree';
import { useSessionStore } from '@/store/session-store';
import { PeaceHouseFormDrawer } from '@/components/organization/peace-house-form-drawer';
import { PeaceHouseDetailDrawer } from '@/components/organization/peace-house-detail-drawer';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { toEntityStatus } from '@/components/organization/mappers';
import { useResolvedCardLeaders } from '@/components/organization/use-resolved-photo';
import { ApiError } from '@/lib/http-client';

/**
 * Casas de Paz — list, filter, create, edit, view and deactivate (doc07).
 *
 * doc05 Matriz de Permisos: "Crear Casa de Paz"/"Cerrar Casa de Paz" are ✅
 * for Administrador, Pastor General and Pastor Distrito, ❌ for Líder — so
 * a Líder gets a read-only screen rather than buttons that would 403.
 */
const ROLES_THAT_MANAGE_PEACE_HOUSES: readonly RoleName[] = [
  RoleName.ADMIN,
  RoleName.GENERAL_PASTOR,
  RoleName.DISTRICT_PASTOR,
];

const ALL = '__all__';

/**
 * Its own component so `useResolvedCardLeaders` (two fixed `useStoredFilePreview`
 * calls per instance) runs once per card instead of inside the list's `.map` —
 * a variable number of hook calls per render would break the Rules of Hooks.
 */
function PeaceHouseListCard({
  house,
  node,
  districtName,
  municipality,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  house: PeaceHouse;
  node: PeaceHouseNode | undefined;
  districtName: string | undefined;
  municipality: string | undefined;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const leaders = useResolvedCardLeaders(node?.leadership ?? null);

  return (
    <PeaceHouseCard
      name={house.name}
      district={districtName}
      leaders={leaders}
      leadersAvatarClassName="size-[38px]"
      address={house.address ?? undefined}
      municipality={municipality}
      meetingDay={house.meetingDay ?? undefined}
      meetingTime={house.meetingHour ?? undefined}
      status={toEntityStatus(house.status)}
      actions={
        <>
          <IconButton
            icon={Eye}
            aria-label={`Ver ${house.name}`}
            variant="ghost"
            size="sm"
            onClick={onView}
          />
          {canManage ? (
            <>
              <IconButton
                icon={Pencil}
                aria-label={`Editar ${house.name}`}
                variant="ghost"
                size="sm"
                onClick={onEdit}
              />
              <IconButton
                icon={Trash2}
                aria-label={`Eliminar ${house.name}`}
                variant="ghost"
                size="sm"
                onClick={onDelete}
              />
            </>
          ) : null}
        </>
      }
    />
  );
}

export default function CasasDePazPage() {
  const user = useSessionStore((state) => state.user);
  const canManage = user ? ROLES_THAT_MANAGE_PEACE_HOUSES.includes(user.role) : false;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState(ALL);
  const [departmentFilter, setDepartmentFilter] = useState(ALL);

  const [editing, setEditing] = useState<PeaceHouse | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewing, setViewing] = useState<PeaceHouse | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PeaceHouse | null>(null);

  // The filter selects and the form both need these; one fetch serves both
  // because React Query dedupes by key.
  const { data: districtsPage } = useDistricts({
    page: 1,
    pageSize: 100,
    sort: 'number',
    order: 'asc',
  });
  const { data: departments } = useDepartments();
  const districts = useMemo(() => districtsPage?.data ?? [], [districtsPage]);

  // The tree carries each Casa de Paz's leadership couple and resolved
  // municipality name (`PeaceHouseNode`) that the paginated list below does
  // not — reused here as a lookup, already cached five minutes by the
  // Distritos and Organigrama screens.
  const { data: tree } = useOrganizationTree();
  const peaceHouseNodeById = useMemo(() => {
    const entries = (tree?.districts ?? []).flatMap((district) =>
      district.peaceHouses.map((node) => [node.id, node] as const),
    );
    return new Map(entries);
  }, [tree]);

  const { data, isPending, isError, error } = usePeaceHouses({
    page,
    pageSize,
    search: search || undefined,
    sort: 'name',
    order: 'asc',
    districtId: districtFilter === ALL ? undefined : districtFilter,
    departmentId: departmentFilter === ALL ? undefined : departmentFilter,
  });

  const deleteMutation = useDeletePeaceHouse();

  const districtNameById = useMemo(
    () =>
      new Map(districts.map((district) => [district.id, `${district.number} · ${district.name}`])),
    [districts],
  );
  const departmentNameById = useMemo(
    () => new Map((departments ?? []).map((department) => [department.id, department.name])),
    [departments],
  );

  const deletionError =
    deleteMutation.error instanceof ApiError
      ? deleteMutation.error.message
      : deleteMutation.error
        ? 'No fue posible eliminar la Casa de Paz.'
        : null;

  /** Any filter change resets to page 1 — see the districts screen. */
  function applyFilter(setter: (value: string) => void, value: string): void {
    setter(value);
    setPage(1);
  }

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Casas de Paz"
        description="Casas de Paz registradas, su distrito, ubicación, horario y liderazgo."
        actions={
          canManage ? (
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditing(undefined);
                setIsFormOpen(true);
              }}
            >
              Nueva Casa de Paz
            </Button>
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar las Casas de Paz"
          description={error.message}
        />
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(value) => {
              applyFilter(setSearch, value);
            }}
            searchPlaceholder="Buscar por nombre, código, barrio o dirección…"
            filters={
              <div className="grid w-full gap-3 tablet:grid-cols-2">
                <Select
                  label="Distrito"
                  options={[
                    { value: ALL, label: 'Todos los distritos' },
                    ...districts.map((district) => ({
                      value: district.id,
                      label: `${district.number} · ${district.name}`,
                    })),
                  ]}
                  value={districtFilter}
                  onValueChange={(value) => {
                    applyFilter(setDistrictFilter, value);
                  }}
                />
                <Select
                  label="Departamento"
                  options={[
                    { value: ALL, label: 'Todos los departamentos' },
                    ...(departments ?? []).map((department) => ({
                      value: department.id,
                      label: department.name,
                    })),
                  ]}
                  value={departmentFilter}
                  onValueChange={(value) => {
                    applyFilter(setDepartmentFilter, value);
                  }}
                />
              </div>
            }
            columnOptions={[]}
            hiddenColumnIds={[]}
            onToggleColumn={() => {}}
            showColumnsMenu={false}
          />

          {isPending ? (
            <Grid>
              {Array.from({ length: pageSize }, (_, index) => (
                <GridItem key={index} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                  <SkeletonCard className="h-56" />
                </GridItem>
              ))}
            </Grid>
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={Home}
              title={search ? 'Sin resultados' : 'Todavía no hay Casas de Paz'}
              description={
                search
                  ? `Ninguna Casa de Paz coincide con "${search}".`
                  : 'Registre la primera Casa de Paz para comenzar.'
              }
              action={
                canManage && !search ? (
                  <Button
                    leftIcon={Plus}
                    onClick={() => {
                      setEditing(undefined);
                      setIsFormOpen(true);
                    }}
                  >
                    Nueva Casa de Paz
                  </Button>
                ) : null
              }
            />
          ) : (
            <Grid>
              {(data?.data ?? []).map((house) => {
                const node: PeaceHouseNode | undefined = peaceHouseNodeById.get(house.id);

                return (
                  <GridItem key={house.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                    <PeaceHouseListCard
                      house={house}
                      node={node}
                      districtName={districtNameById.get(house.districtId)}
                      municipality={
                        node?.municipalityName ??
                        departmentNameById.get(house.departmentId ?? '') ??
                        undefined
                      }
                      canManage={canManage}
                      onView={() => {
                        setViewing(house);
                      }}
                      onEdit={() => {
                        setEditing(house);
                        setIsFormOpen(true);
                      }}
                      onDelete={() => {
                        deleteMutation.reset();
                        setPendingDeletion(house);
                      }}
                    />
                  </GridItem>
                );
              })}
            </Grid>
          )}

          {data && data.meta.total > 0 ? (
            <Pagination
              page={data.meta.page}
              pageSize={data.meta.pageSize}
              total={data.meta.total}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      )}

      {/*
        Mounted only for roles that can actually use it. A closed Drawer
        still runs its hooks, and this one loads the leadership catalog via
        `GET /roles` — which a Líder is refused (403). Rendering it for them
        would fire a failing request on every visit to a screen they are
        otherwise entitled to read.
      */}
      {canManage ? (
        <PeaceHouseFormDrawer
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          districts={districts}
          peaceHouse={editing}
        />
      ) : null}

      <PeaceHouseDetailDrawer
        peaceHouse={viewing}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(null);
          }
        }}
        districtName={viewing ? districtNameById.get(viewing.districtId) : undefined}
        departmentName={viewing ? departmentNameById.get(viewing.departmentId ?? '') : undefined}
      />

      <ConfirmDeleteModal
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeletion(null);
          }
        }}
        itemLabel="la Casa de Paz"
        itemName={pendingDeletion?.name ?? ''}
        loading={deleteMutation.isPending}
        error={deletionError}
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
