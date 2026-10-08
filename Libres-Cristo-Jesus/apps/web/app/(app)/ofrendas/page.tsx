'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Coins, Sigma } from 'lucide-react';
import {
  Container,
  DataTable,
  EmptyState,
  Grid,
  GridItem,
  Input,
  KPICard,
  PageHeader,
  Pagination,
  Select,
  type DataTableColumn,
  type DataTableSort,
} from '@lcj/ui';
import { RoleName, type OfferingHistoryRow } from '@lcj/types';
import { useDistricts } from '@/hooks/use-districts';
import { useOfferingSummary, useOfferings } from '@/hooks/use-offerings';
import { usePeaceHouses } from '@/hooks/use-peace-houses';
import { useSessionStore } from '@/store/session-store';
import { formatCurrencyCOP, formatDate, formatNumber } from '@/lib/format';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Ofrendas — historial y estadísticas (doc19 `/offerings`, Fase 8).
 *
 * READ ONLY BY DESIGN. An offering is registered on the meeting that
 * produced it, where the weekly lock applies; letting it be typed in from a
 * cross-cutting list would be a way around that lock.
 *
 * The KPIs come from `/offerings/summary`, aggregated in the database over
 * the WHOLE filter — never summed from the rows on screen, which would make
 * the total change every time the user turned the page.
 *
 * Every role sees only the offerings within its scope: the backend narrows
 * the query, this screen filters nothing by hand.
 */

const ALL = '__all__';
const PAGE_SIZE = 20;
/** The API caps `pageSize` at 100; filters need the list, not a page of it. */
const FILTER_PAGE_SIZE = 100;

/**
 * Filter controls default to the full width of their container, so without
 * a cap they stack one per line and push the table off the first screen.
 */
const FILTER_WIDTH = 'w-full tablet:w-52';

/** doc05: a Líder has no district-level view, so the filter is not offered. */
const ROLES_WITH_DISTRICT_FILTER: readonly RoleName[] = [
  RoleName.ADMIN,
  RoleName.GENERAL_PASTOR,
  RoleName.DISTRICT_PASTOR,
];

/**
 * Its own component so `GET /districts` is only ever requested by a role
 * allowed to call it: a hook inside a component that is not rendered does
 * not run, whereas a `useDistricts()` in the page body would fire — and
 * 403 — for every Líder who opened this screen.
 */
function DistrictFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (districtId: string) => void;
}) {
  const { data } = useDistricts({ page: 1, pageSize: FILTER_PAGE_SIZE });

  return (
    <Select
      label="Distrito"
      containerClassName={FILTER_WIDTH}
      options={[
        { value: ALL, label: 'Todos los distritos' },
        ...(data?.data ?? []).map((district) => ({ value: district.id, label: district.name })),
      ]}
      value={value}
      onValueChange={onChange}
    />
  );
}

export default function OfrendasPage() {
  const user = useSessionStore((state) => state.user);
  const canFilterByDistrict = user ? ROLES_WITH_DISTRICT_FILTER.includes(user.role) : false;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [districtId, setDistrictId] = useState(ALL);
  const [peaceHouseId, setPeaceHouseId] = useState(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  /**
   * `null` until the user asks for an order, so the API applies its own
   * default — the most recent MEETING first. Seeding this with a column
   * would replace that with whatever the screen happened to guess.
   */
  const [sort, setSort] = useState<DataTableSort | null>(null);

  const { data: housesPage } = usePeaceHouses({
    page: 1,
    pageSize: FILTER_PAGE_SIZE,
    ...(districtId === ALL ? {} : { districtId }),
  });

  // The filters shared by the list and its statistics. Memoised because
  // both hooks key their cache on this object.
  const filters = useMemo(
    () => ({
      districtId: districtId === ALL ? undefined : districtId,
      peaceHouseId: peaceHouseId === ALL ? undefined : peaceHouseId,
      from: from || undefined,
      to: to || undefined,
    }),
    [districtId, peaceHouseId, from, to],
  );

  const { data, isPending, isError, error } = useOfferings({
    ...filters,
    page,
    pageSize,
    ...(sort ? { sort: sort.columnId, order: sort.direction } : {}),
  });

  const { data: summary } = useOfferingSummary(filters);

  const resetPage = () => {
    setPage(1);
  };

  /** An absent extreme means "no offerings matched", not "zero pesos". */
  const currencyOrDash = (amount: number | null | undefined): string =>
    amount === null || amount === undefined ? '—' : formatCurrencyCOP(amount);

  const columns: DataTableColumn<OfferingHistoryRow>[] = [
    {
      id: 'meetingDate',
      header: 'Fecha de reunión',
      accessor: (row) => formatDate(row.meetingDate),
    },
    {
      id: 'week',
      header: 'Semana ISO',
      accessor: (row) => `${row.isoWeek} · ${row.isoYear}`,
      hideable: true,
    },
    { id: 'peaceHouseName', header: 'Casa de Paz', accessor: (row) => row.peaceHouseName },
    {
      // The only sortable column: the API sorts offerings by amount or by
      // registration date, and nothing else.
      id: 'amount',
      header: 'Valor',
      headerClassName: 'text-right',
      className: 'text-right tabular-nums',
      accessor: (row) => formatCurrencyCOP(row.amount),
      sortable: true,
    },
    {
      id: 'notes',
      header: 'Observaciones',
      accessor: (row) => row.notes ?? '—',
      hideable: true,
    },
  ];

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Ofrendas"
        description="Historial y estadísticas de las ofrendas registradas en las reuniones."
      />

      <Grid>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label="Total recogido"
            value={summary ? formatCurrencyCOP(summary.total) : '—'}
            icon={Coins}
            loading={!summary}
          />
        </GridItem>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label="Promedio por ofrenda"
            value={summary ? formatCurrencyCOP(summary.average) : '—'}
            icon={Sigma}
            loading={!summary}
          />
        </GridItem>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label="Ofrenda más alta"
            value={currencyOrDash(summary?.max)}
            icon={ArrowUpRight}
            loading={!summary}
          />
        </GridItem>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label="Ofrenda más baja"
            value={currencyOrDash(summary?.min)}
            icon={ArrowDownRight}
            loading={!summary}
          />
        </GridItem>
      </Grid>

      {/*
        Spelled out because the number invites the wrong reading: the average
        is per REGISTERED offering, not per week on the calendar. A week
        nobody reported is missing data, and counting it as zero would
        quietly punish a Casa de Paz for a leader who was late with the form.
      */}
      {summary ? (
        <p className="text-caption text-foreground-muted">
          {formatNumber(summary.count)}{' '}
          {summary.count === 1 ? 'ofrenda registrada' : 'ofrendas registradas'} en el filtro actual.
          El promedio se calcula sobre las ofrendas registradas, no sobre las semanas del
          calendario.
        </p>
      ) : null}

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar las ofrendas"
          description={error.message}
        />
      ) : (
        <DataTable
          caption="Historial de ofrendas"
          columns={columns}
          rows={data?.data ?? []}
          getRowId={(row) => row.id}
          loading={isPending}
          filters={
            <div className="flex flex-wrap items-end gap-3">
              {canFilterByDistrict ? (
                <DistrictFilter
                  value={districtId}
                  onChange={(value) => {
                    setDistrictId(value);
                    // The Casa de Paz filter only lists houses of the chosen
                    // district, so a selection from another one would
                    // silently return nothing.
                    setPeaceHouseId(ALL);
                    resetPage();
                  }}
                />
              ) : null}

              <Select
                label="Casa de Paz"
                containerClassName={FILTER_WIDTH}
                options={[
                  { value: ALL, label: 'Todas las Casas de Paz' },
                  ...(housesPage?.data ?? []).map((house) => ({
                    value: house.id,
                    label: house.name,
                  })),
                ]}
                value={peaceHouseId}
                onValueChange={(value) => {
                  setPeaceHouseId(value);
                  resetPage();
                }}
              />

              <Input
                type="date"
                label="Desde"
                containerClassName={FILTER_WIDTH}
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  resetPage();
                }}
              />
              <Input
                type="date"
                label="Hasta"
                containerClassName={FILTER_WIDTH}
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  resetPage();
                }}
              />
            </div>
          }
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            resetPage();
          }}
          emptyState={
            <EmptyState
              icon={Coins}
              title="Sin ofrendas registradas"
              description="Las ofrendas se registran en la reunión de cada semana. Ajuste los filtros o registre la primera desde la pantalla de Reuniones."
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
                  resetPage();
                }}
              />
            ) : null
          }
        />
      )}
    </Container>
  );
}
