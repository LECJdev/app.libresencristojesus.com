'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Network, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Container,
  DataTableToolbar,
  EmptyState,
  Grid,
  GridItem,
  IconButton,
  OrganizationCard,
  PageHeader,
  Pagination,
  SkeletonCard,
} from '@lcj/ui';
import { RoleName, type DistrictNode, type District } from '@lcj/types';
import { useDeleteDistrict, useDistricts } from '@/hooks/use-districts';
import { useOrganizationTree } from '@/hooks/use-organization-tree';
import { useSessionStore } from '@/store/session-store';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { DistrictFormDrawer } from '@/components/organization/district-form-drawer';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { toEntityStatus } from '@/components/organization/mappers';
import { useResolvedCardLeaders } from '@/components/organization/use-resolved-photo';
import { ApiError } from '@/lib/http-client';

/**
 * Distritos — list, create, edit and deactivate (doc06, doc07 US-005).
 *
 * Server-driven table: search, sort and pagination are query params
 * (doc19 §6/§7), never client-side slicing of a full download — the point
 * of paginating is not to ship every row.
 *
 * Write actions are hidden for roles that cannot perform them, following
 * doc05 line 536 ("Si un Líder no puede crear usuarios, el botón 'Nuevo
 * Usuario' ni siquiera debe mostrarse"). The backend enforces the same
 * rule; this only avoids offering an action that would 403.
 */

/** doc05 Matriz de Permisos: Crear/Editar Distrito ✅ only for these two. */
const ROLES_THAT_MANAGE_DISTRICTS: readonly RoleName[] = [RoleName.ADMIN, RoleName.GENERAL_PASTOR];

const PAGE_SIZE = 20;

/**
 * Its own component so `useResolvedCardLeaders` (two fixed `useStoredFilePreview`
 * calls per instance) runs once per card instead of inside the list's `.map` —
 * a variable number of hook calls per render would break the Rules of Hooks.
 */
function DistrictListCard({
  district,
  node,
  canManage,
  onEdit,
  onDelete,
}: {
  district: District;
  node: DistrictNode | undefined;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const leaders = useResolvedCardLeaders(node?.leadership ?? null, true);

  return (
    <OrganizationCard
      name={district.name}
      type={`Distrito N.º ${district.number}`}
      leaders={leaders}
      leadersAvatarClassName="size-[58px]"
      status={toEntityStatus(district.status)}
      metrics={node ? [{ label: 'Casas de Paz', value: node.peaceHouseCount }] : undefined}
      actions={
        canManage ? (
          <>
            <IconButton
              icon={Pencil}
              aria-label={`Editar ${district.name}`}
              variant="ghost"
              size="sm"
              onClick={onEdit}
            />
            <IconButton
              icon={Trash2}
              aria-label={`Eliminar ${district.name}`}
              variant="ghost"
              size="sm"
              onClick={onDelete}
            />
          </>
        ) : undefined
      }
    />
  );
}

export default function DistritosPage() {
  const user = useSessionStore((state) => state.user);
  const canManage = user ? ROLES_THAT_MANAGE_DISTRICTS.includes(user.role) : false;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<District | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<District | null>(null);

  // The Church id every district belongs to. The tree already carries it and
  // is cached for five minutes, so this costs no extra request in practice.
  // It also carries the leadership couple and Casa de Paz count per district
  // (`DistrictNode`) that the paginated list below does not — reused here as
  // a lookup rather than fetched a second time.
  const { data: tree } = useOrganizationTree();
  const districtNodeById = useMemo(
    () => new Map((tree?.districts ?? []).map((node) => [node.id, node])),
    [tree],
  );

  const { data, isPending, isError, error } = useDistricts({
    page,
    pageSize,
    search: search || undefined,
    sort: 'number',
    order: 'asc',
  });

  const deleteMutation = useDeleteDistrict();

  const deletionError =
    deleteMutation.error instanceof ApiError
      ? deleteMutation.error.message
      : deleteMutation.error
        ? 'No fue posible eliminar el distrito.'
        : null;

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Distritos"
        description="Distritos de la iglesia, sus parejas pastorales y su estado."
        actions={
          canManage ? (
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditing(undefined);
                setIsFormOpen(true);
              }}
            >
              Nuevo distrito
            </Button>
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar los distritos"
          description={error.message}
        />
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(value) => {
              setSearch(value);
              // Any new filter invalidates the current page number: staying
              // on page 4 of a result set that now has one page shows
              // nothing.
              setPage(1);
            }}
            searchPlaceholder="Buscar por nombre…"
            columnOptions={[]}
            hiddenColumnIds={[]}
            onToggleColumn={() => {}}
            showColumnsMenu={false}
          />

          {isPending ? (
            <Grid>
              {Array.from({ length: pageSize }, (_, index) => (
                <GridItem key={index} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                  <SkeletonCard className="h-48" />
                </GridItem>
              ))}
            </Grid>
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={Network}
              title={search ? 'Sin resultados' : 'Todavía no hay distritos'}
              description={
                search
                  ? `Ningún distrito coincide con "${search}".`
                  : 'Cree el primer distrito para empezar a organizar las Casas de Paz.'
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
                    Nuevo distrito
                  </Button>
                ) : null
              }
            />
          ) : (
            <Grid>
              {(data?.data ?? []).map((district) => {
                const node: DistrictNode | undefined = districtNodeById.get(district.id);

                return (
                  <GridItem key={district.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                    <DistrictListCard
                      district={district}
                      node={node}
                      canManage={canManage}
                      onEdit={() => {
                        setEditing(district);
                        setIsFormOpen(true);
                      }}
                      onDelete={() => {
                        deleteMutation.reset();
                        setPendingDeletion(district);
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
        Gated on `canManage` as well as on the Church being loaded: a closed
        Drawer still runs its hooks, and this one calls `GET /roles` to fill
        the pastor selector — a request a Pastor de Distrito or Líder is
        refused with 403.
      */}
      {canManage && tree ? (
        <DistrictFormDrawer
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          churchId={tree.id}
          district={editing}
        />
      ) : null}

      <ConfirmDeleteModal
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeletion(null);
          }
        }}
        itemLabel="el distrito"
        itemName={pendingDeletion?.name ?? ''}
        loading={deleteMutation.isPending}
        error={deletionError}
        onConfirm={() => {
          if (!pendingDeletion) {
            return;
          }
          deleteMutation.mutate(pendingDeletion.id, {
            // Closed only on success: a 409 ("still has active Casas de
            // Paz") must stay visible in the dialog that caused it.
            onSuccess: () => {
              setPendingDeletion(null);
            },
          });
        }}
      />
    </Container>
  );
}
