'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, FileBarChart, FileSpreadsheet } from 'lucide-react';
import {
  Badge,
  Button,
  Container,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Select,
  type DataTableColumn,
} from '@lcj/ui';
import { RoleName, type ReportPreview, type ReportType } from '@lcj/types';
import { useDistricts } from '@/hooks/use-districts';
import { usePeaceHouses } from '@/hooks/use-peace-houses';
import { useDownloadReport, useReportPreview } from '@/hooks/use-reports';
import { useSessionStore } from '@/store/session-store';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { formatCurrencyCOP, formatDate, formatNumber } from '@/lib/format';
import { resolveApiErrorMessage } from '@/lib/api-error-message';

/**
 * Reportes consolidados y exportación a Excel (doc05 "Exportar Excel" ✅✅✅✅).
 *
 * ── The table does not know what a report looks like ─────────────────
 * Columns are built from `preview.columns`, which the API sends alongside
 * the rows — the SAME list the spreadsheet writes. So this screen has no
 * per-report rendering code at all, and a column added on the server shows
 * up here and in the download together. Hardcoding headers per type here
 * would reintroduce exactly the drift the shared definition exists to stop.
 *
 * Every report is already narrowed to the caller's scope by the API; the
 * filters below are the user's own choice, never a claim about what they
 * may read. `scopeLabel` states what the figures cover, out loud.
 */

const ALL = '__all__';
const PAGE_SIZE = 20;
const FILTER_PAGE_SIZE = 100;

/**
 * Filter controls default to the full width of their container, so without
 * a cap they stack one per line and push the table off the first screen.
 * A fixed basis lets them sit in a row on desktop and wrap on a phone.
 */
const FILTER_WIDTH = 'w-full tablet:w-52';

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'attendance', label: 'Asistencia por reunión' },
  { value: 'offerings', label: 'Ofrendas por reunión' },
  { value: 'people', label: 'Personas' },
  { value: 'peace-houses', label: 'Casas de Paz' },
];

/** The two reports that describe a present state ignore the date range. */
const DATE_AWARE_REPORTS: readonly ReportType[] = ['attendance', 'offerings'];

/** doc05: a Líder has no district-level view, so the filter is not offered. */
const ROLES_WITH_DISTRICT_FILTER: readonly RoleName[] = [
  RoleName.ADMIN,
  RoleName.GENERAL_PASTOR,
  RoleName.DISTRICT_PASTOR,
];

/**
 * Its own component so `GET /districts` is only requested by a role allowed
 * to call it — a hook inside a component that is not rendered does not run.
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

/** Renders one cell in the shape its column declares. */
function renderCell(
  value: string | number | null,
  format: ReportPreview['columns'][number]['format'],
): string {
  if (value === null || value === '') {
    return '—';
  }

  if (format === 'currency' && typeof value === 'number') {
    return formatCurrencyCOP(value);
  }

  if (format === 'number' && typeof value === 'number') {
    return formatNumber(value);
  }

  // Dates arrive as `YYYY-MM-DD`; `formatDate` wants something `Date` can
  // parse, and that string is exactly that.
  if (format === 'date' && typeof value === 'string') {
    return formatDate(value);
  }

  return String(value);
}

type ReportRow = Record<string, string | number | null>;

export default function ReportesPage() {
  const user = useSessionStore((state) => state.user);
  const canFilterByDistrict = user ? ROLES_WITH_DISTRICT_FILTER.includes(user.role) : false;

  const [type, setType] = useState<ReportType>('attendance');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [districtId, setDistrictId] = useState(ALL);
  const [peaceHouseId, setPeaceHouseId] = useState(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const supportsDates = DATE_AWARE_REPORTS.includes(type);

  const { data: housesPage } = usePeaceHouses({
    page: 1,
    pageSize: FILTER_PAGE_SIZE,
    ...(districtId === ALL ? {} : { districtId }),
  });

  const filters = useMemo(
    () => ({
      districtId: districtId === ALL ? undefined : districtId,
      peaceHouseId: peaceHouseId === ALL ? undefined : peaceHouseId,
      ...(supportsDates ? { from: from || undefined, to: to || undefined } : {}),
    }),
    [districtId, peaceHouseId, from, to, supportsDates],
  );

  const { data, isPending, isError, error } = useReportPreview(type, {
    ...filters,
    page,
    pageSize,
  });

  const downloadMutation = useDownloadReport();

  const preview = data?.data;

  // Built from what the API declared, never from a local per-type table.
  const columns: DataTableColumn<ReportRow>[] = (preview?.columns ?? []).map((column) => ({
    id: column.key,
    header: column.header,
    className:
      column.format === 'currency' || column.format === 'number'
        ? 'text-right tabular-nums'
        : undefined,
    headerClassName:
      column.format === 'currency' || column.format === 'number' ? 'text-right' : undefined,
    accessor: (row) => renderCell(row[column.key] ?? null, column.format),
  }));

  const resetPage = () => {
    setPage(1);
  };

  const downloadError = resolveApiErrorMessage(
    downloadMutation.error,
    'No fue posible generar el archivo.',
  );

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Reportes"
        description="Consolidados por asistencia, ofrendas, personas y Casas de Paz."
        actions={
          <div className="flex items-center gap-3">
            {preview ? <Badge variant="info">{preview.scopeLabel}</Badge> : null}
            <Button
              leftIcon={FileSpreadsheet}
              loading={downloadMutation.isPending}
              disabled={!preview || (data?.meta.total ?? 0) === 0}
              onClick={() => {
                downloadMutation.mutate({ type, params: filters });
              }}
            >
              Exportar a Excel
            </Button>
          </div>
        }
      />

      {downloadError ? (
        <p
          role="alert"
          className="rounded-md border border-error-500 bg-error-50 px-4 py-3 text-small text-error-600"
        >
          {downloadError}
        </p>
      ) : null}

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar el reporte"
          description={error.message}
        />
      ) : (
        <DataTable
          caption={preview?.title ?? 'Reporte'}
          columns={columns}
          rows={(preview?.rows ?? []) as ReportRow[]}
          getRowId={(_row, index) => String(index)}
          loading={isPending}
          filters={
            <div className="flex flex-wrap items-end gap-3">
              <Select
                label="Reporte"
                containerClassName={FILTER_WIDTH}
                options={REPORT_OPTIONS}
                value={type}
                onValueChange={(value) => {
                  setType(value as ReportType);
                  resetPage();
                }}
              />

              {canFilterByDistrict ? (
                <DistrictFilter
                  value={districtId}
                  onChange={(value) => {
                    setDistrictId(value);
                    // The house list only holds houses of the chosen
                    // district, so a stale selection would match nothing.
                    setPeaceHouseId(ALL);
                    resetPage();
                  }}
                />
              ) : null}

              <Select
                label="Casa de Paz"
                containerClassName={FILTER_WIDTH}
                options={[
                  { value: ALL, label: 'Todas' },
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

              {/*
                Hidden rather than disabled on the two reports that describe a
                present state: the server ignores the range there, and a
                control that silently does nothing is worse than no control.
              */}
              {supportsDates ? (
                <>
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
                </>
              ) : null}
            </div>
          }
          emptyState={
            <EmptyState
              icon={FileBarChart}
              title="Sin datos para este reporte"
              description="Ajuste los filtros o registre información en el módulo correspondiente."
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
