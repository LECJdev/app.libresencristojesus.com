'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
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
  PersonCard,
  Select,
  SkeletonCard,
} from '@lcj/ui';
import { RoleName, type Person, type RecordStatus } from '@lcj/types';
import { useDeletePerson, usePeople, usePersonStages } from '@/hooks/use-people';
import { usePeaceHouses } from '@/hooks/use-peace-houses';
import { useResourceList } from '@/hooks/use-resource-list';
import { useSessionStore } from '@/store/session-store';
import { PersonFormDrawer } from '@/components/people/person-form-drawer';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { PersonDetailDrawer } from '@/components/people/person-detail-drawer';
import { ConfirmDeleteModal } from '@/components/organization/confirm-delete-modal';
import { toEntityStatus } from '@/components/organization/mappers';
import { resolveApiErrorMessage } from '@/lib/api-error-message';

/**
 * Personas — the attendees of the Casas de Paz (doc04 §5).
 *
 * The listing is already scoped by the API: a Líder receives only the
 * people of their own Casa de Paz, a Pastor de Distrito only those of
 * their district. This screen never filters by role itself — doing so
 * would mean the rows had already reached the browser.
 *
 * Every role may register and edit (doc05 Rol 4 lists attendee follow-up as
 * a Líder capability); `delete` is reserved, matching how the backend
 * grants it.
 */
const ROLES_THAT_DELETE: readonly RoleName[] = [
  RoleName.ADMIN,
  RoleName.GENERAL_PASTOR,
  RoleName.DISTRICT_PASTOR,
];

const ALL = '__all__';

export default function PersonasPage() {
  const user = useSessionStore((state) => state.user);
  const canDelete = user ? ROLES_THAT_DELETE.includes(user.role) : false;

  const list = useResourceList(
    { peaceHouseId: ALL, personStageId: ALL, status: ALL },
    { defaultSort: { columnId: 'lastName', direction: 'asc' } },
  );

  const [editing, setEditing] = useState<Person | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Person | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Person | null>(null);

  const { data: housesPage } = usePeaceHouses({ page: 1, pageSize: 100 });
  const { data: stages } = usePersonStages();
  const peaceHouses = useMemo(() => housesPage?.data ?? [], [housesPage]);
  const houseNameById = useMemo(
    () => new Map(peaceHouses.map((house) => [house.id, house.name])),
    [peaceHouses],
  );

  const { data, isPending, isError, error } = usePeople({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search || undefined,
    sort: list.sort.columnId,
    order: list.sort.direction,
    peaceHouseId: list.filters.peaceHouseId === ALL ? undefined : list.filters.peaceHouseId,
    personStageId: list.filters.personStageId === ALL ? undefined : list.filters.personStageId,
    status: list.filters.status === ALL ? undefined : (list.filters.status as RecordStatus),
  });

  const deleteMutation = useDeletePerson();

  const people = data?.data ?? [];
  const showEmptyState = !isPending && people.length === 0;

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Personas"
        description="Asistentes de las Casas de Paz, su etapa en el proceso y su historial."
        actions={
          <Button
            leftIcon={Plus}
            onClick={() => {
              setEditing(undefined);
              setIsFormOpen(true);
            }}
          >
            Nueva persona
          </Button>
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar las personas"
          description={error.message}
        />
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-4">
          <DataTableToolbar
            searchValue={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Buscar por nombre, documento, teléfono o correo…"
            filters={
              <div className="grid w-full gap-3 tablet:grid-cols-2">
                <Select
                  label="Casa de Paz"
                  options={[
                    { value: ALL, label: 'Todas las Casas de Paz' },
                    ...peaceHouses.map((house) => ({ value: house.id, label: house.name })),
                  ]}
                  value={list.filters.peaceHouseId}
                  onValueChange={(value) => {
                    list.setFilter('peaceHouseId', value);
                  }}
                />
                <Select
                  label="Etapa del proceso"
                  options={[
                    { value: ALL, label: 'Todas las etapas' },
                    ...(stages ?? []).map((stage) => ({ value: stage.id, label: stage.name })),
                  ]}
                  value={list.filters.personStageId}
                  onValueChange={(value) => {
                    list.setFilter('personStageId', value);
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
              {Array.from({ length: list.pageSize }, (_, index) => (
                <GridItem key={index} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                  <SkeletonCard className="h-56" />
                </GridItem>
              ))}
            </Grid>
          ) : showEmptyState ? (
            <EmptyState
              icon={UsersRound}
              title={list.search ? 'Sin resultados' : 'Todavía no hay personas registradas'}
              description={
                list.search
                  ? `Nadie coincide con "${list.search}".`
                  : 'Registre a la primera persona. Solo hacen falta sus nombres y apellidos.'
              }
              action={
                !list.search ? (
                  <Button
                    leftIcon={Plus}
                    onClick={() => {
                      setEditing(undefined);
                      setIsFormOpen(true);
                    }}
                  >
                    Nueva persona
                  </Button>
                ) : null
              }
            />
          ) : (
            <Grid>
              {people.map((person) => (
                <GridItem key={person.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                  <PersonCard
                    firstName={person.firstName}
                    lastName={person.lastName}
                    document={person.document ?? undefined}
                    phone={person.phone ?? undefined}
                    email={person.email ?? undefined}
                    stage={person.personStageName ?? undefined}
                    peaceHouse={
                      houseNameById.get(person.currentPeaceHouseId ?? '') ?? 'Sin asignar'
                    }
                    status={toEntityStatus(person.status)}
                    actions={
                      <>
                        <IconButton
                          icon={Eye}
                          aria-label={`Ver ${person.firstName} ${person.lastName}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewing(person);
                          }}
                        />
                        <IconButton
                          icon={Pencil}
                          aria-label={`Editar ${person.firstName} ${person.lastName}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(person);
                            setIsFormOpen(true);
                          }}
                        />
                        {canDelete ? (
                          <IconButton
                            icon={Trash2}
                            aria-label={`Eliminar ${person.firstName} ${person.lastName}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              deleteMutation.reset();
                              setPendingDeletion(person);
                            }}
                          />
                        ) : null}
                      </>
                    }
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

      <PersonFormDrawer
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        peaceHouses={peaceHouses}
        person={editing}
      />

      <PersonDetailDrawer
        person={viewing}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(null);
          }
        }}
        peaceHouseName={viewing ? houseNameById.get(viewing.currentPeaceHouseId ?? '') : undefined}
      />

      <ConfirmDeleteModal
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeletion(null);
          }
        }}
        itemLabel="a la persona"
        itemName={pendingDeletion ? `${pendingDeletion.firstName} ${pendingDeletion.lastName}` : ''}
        loading={deleteMutation.isPending}
        error={resolveApiErrorMessage(deleteMutation.error, 'No fue posible eliminar la persona.')}
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
