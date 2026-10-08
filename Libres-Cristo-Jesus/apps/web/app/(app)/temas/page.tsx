'use client';

import { useState } from 'react';
import { AlertTriangle, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Container,
  DataTable,
  EmptyState,
  EntityStatusBadge,
  IconButton,
  PageHeader,
  Pagination,
  Select,
  type DataTableColumn,
  type DataTableSort,
} from '@lcj/ui';
import { RoleName, type SermonTheme } from '@lcj/types';
import {
  useDeleteSermonTheme,
  useSermonThemeSeries,
  useSermonThemes,
} from '@/hooks/use-sermon-themes';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { useSessionStore } from '@/store/session-store';
import { SermonThemeFormDrawer } from '@/components/meetings/sermon-theme-form-drawer';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { toEntityStatus } from '@/components/organization/mappers';
import { resolveApiErrorMessage } from '@/lib/api-error-message';

/**
 * Temas de predicación — the catalog every meeting report picks from
 * (doc04 §6).
 *
 * GLOBAL BY NATURE: there is no "my theme", so this screen has no Casa de
 * Paz filter and no scope. What a role may do here differs, though —
 * doc05: registering follows "Registrar Reunión" (Administrador + Líder),
 * while deleting is Administrador only, because a theme is shared by every
 * Casa de Paz that ever used it and removing one is never a local decision.
 */

const ROLES_THAT_MANAGE_THEMES: readonly RoleName[] = [RoleName.ADMIN, RoleName.LEADER];
const ROLES_THAT_DELETE_THEMES: readonly RoleName[] = [RoleName.ADMIN];

const ALL_SERIES = '__all__';
const PAGE_SIZE = 20;

export default function TemasPage() {
  const user = useSessionStore((state) => state.user);
  const canManage = user ? ROLES_THAT_MANAGE_THEMES.includes(user.role) : false;
  const canDelete = user ? ROLES_THAT_DELETE_THEMES.includes(user.role) : false;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState(ALL_SERIES);
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'title', direction: 'asc' });

  const [editing, setEditing] = useState<SermonTheme | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<SermonTheme | null>(null);

  const { data: seriesList } = useSermonThemeSeries();

  const { data, isPending, isError, error } = useSermonThemes({
    page,
    pageSize,
    search: search || undefined,
    series: series === ALL_SERIES ? undefined : series,
    sort: sort.columnId,
    order: sort.direction,
  });

  const deleteMutation = useDeleteSermonTheme();

  const columns: DataTableColumn<SermonTheme>[] = [
    { id: 'title', header: 'Tema', accessor: (row) => row.title, sortable: true },
    {
      id: 'series',
      header: 'Serie',
      accessor: (row) => row.series ?? '—',
      sortable: true,
      hideable: true,
    },
    {
      id: 'description',
      header: 'Descripción',
      accessor: (row) => row.description ?? '—',
      hideable: true,
    },
    {
      // Not sortable: the API only sorts themes by title, series and dates,
      // and a header arrow that reorders nothing is worse than no arrow.
      id: 'status',
      header: 'Estado',
      accessor: (row) => <EntityStatusBadge status={toEntityStatus(row.status)} />,
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: 'Acciones',
            headerClassName: 'text-right',
            className: 'text-right',
            accessor: (row: SermonTheme) => (
              <div className="flex justify-end gap-1">
                <IconButton
                  icon={Pencil}
                  aria-label={`Editar ${row.title}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(row);
                    setIsFormOpen(true);
                  }}
                />
                {canDelete ? (
                  <IconButton
                    icon={Trash2}
                    aria-label={`Eliminar ${row.title}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      deleteMutation.reset();
                      setPendingDeletion(row);
                    }}
                  />
                ) : null}
              </div>
            ),
          } satisfies DataTableColumn<SermonTheme>,
        ]
      : []),
  ];

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Temas de predicación"
        description="Catálogo compartido por todas las Casas de Paz."
        actions={
          canManage ? (
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditing(undefined);
                setIsFormOpen(true);
              }}
            >
              Nuevo tema
            </Button>
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar los temas"
          description={error.message}
        />
      ) : (
        <DataTable
          caption="Catálogo de temas de predicación"
          columns={columns}
          rows={data?.data ?? []}
          getRowId={(row) => row.id}
          loading={isPending}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Buscar por título, serie o descripción…"
          filters={
            <Select
              label="Serie"
              containerClassName="w-full tablet:w-52"
              options={[
                { value: ALL_SERIES, label: 'Todas las series' },
                ...(seriesList ?? []).map((name) => ({ value: name, label: name })),
              ]}
              value={series}
              onValueChange={(value) => {
                setSeries(value);
                setPage(1);
              }}
            />
          }
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            setPage(1);
          }}
          emptyState={
            <EmptyState
              icon={BookOpen}
              title={search ? 'Sin resultados' : 'Todavía no hay temas'}
              description={
                search
                  ? `Ningún tema coincide con "${search}".`
                  : 'Registre el primer tema para poder asociarlo a las reuniones.'
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
                    Nuevo tema
                  </Button>
                ) : null
              }
            />
          }
          pagination={
            data && data.meta.total > 0 ? (
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
            ) : null
          }
        />
      )}

      {canManage ? (
        <SermonThemeFormDrawer open={isFormOpen} onOpenChange={setIsFormOpen} theme={editing} />
      ) : null}

      <ConfirmDeleteModal
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeletion(null);
          }
        }}
        itemLabel="el tema"
        itemName={pendingDeletion?.title ?? ''}
        loading={deleteMutation.isPending}
        error={resolveApiErrorMessage(deleteMutation.error, 'No fue posible eliminar el tema.')}
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
