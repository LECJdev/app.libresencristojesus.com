'use client';

import {
  Badge,
  ChartCard,
  DataTable,
  KPICard,
  KPIGrid,
  Pagination,
  type DataTableColumn,
  type DataTableSort,
} from '@lcj/ui';
import { HandCoins, Home, Percent, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

interface PersonRow {
  id: string;
  name: string;
  phone: string;
  stage: string;
  peaceHouse: string;
}

const ROWS: PersonRow[] = [
  { id: '1', name: 'Ana Torres', phone: '300 111 2222', stage: 'Discípulo', peaceHouse: 'Betania' },
  { id: '2', name: 'Carlos Gómez', phone: '300 222 3333', stage: 'Nuevo', peaceHouse: 'Emanuel' },
  {
    id: '3',
    name: 'Beatriz Ríos',
    phone: '300 333 4444',
    stage: 'Consolidación',
    peaceHouse: 'Betania',
  },
  { id: '4', name: 'David Peña', phone: '300 444 5555', stage: 'Asistente', peaceHouse: 'Shalom' },
];

const COLUMNS: DataTableColumn<PersonRow>[] = [
  { id: 'name', header: 'Nombre', accessor: (row) => row.name, sortable: true },
  { id: 'phone', header: 'Teléfono', accessor: (row) => row.phone },
  {
    id: 'stage',
    header: 'Etapa',
    accessor: (row) => <Badge variant="info">{row.stage}</Badge>,
    hideable: true,
  },
  { id: 'peaceHouse', header: 'Casa de Paz', accessor: (row) => row.peaceHouse, hideable: true },
];

export function DataDisplaySection() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DataTableSort | null>(null);
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const filtered = ROWS.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()));
    if (!sort) {
      return filtered;
    }
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => direction * a.name.localeCompare(b.name));
  }, [search, sort]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">KPICard / KPIGrid</h3>
        <KPIGrid columns={4}>
          <KPICard
            label="Asistencia"
            value={154}
            icon={Users}
            accent="primary"
            trend={{ direction: 'up', value: '8 %' }}
          />
          <KPICard
            label="Casas de Paz"
            value={12}
            icon={Home}
            accent="gold"
            trend={{ direction: 'flat', value: '0' }}
          />
          <KPICard
            label="Ofrenda"
            value="$ 1.250.000"
            icon={HandCoins}
            accent="success"
            trend={{ direction: 'up', value: '12 %' }}
          />
          <KPICard
            label="Retención"
            value="92 %"
            icon={Percent}
            accent="info"
            trend={{ direction: 'down', value: '2 %' }}
          />
        </KPIGrid>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">ChartCard</h3>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <ChartCard title="Asistencia por semana" description="Últimas 6 semanas">
            <div className="flex h-56 items-end gap-3">
              {[40, 65, 50, 80, 60, 90].map((height, index) => (
                <div
                  key={index}
                  className="w-full rounded-t-sm bg-primary-500"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </ChartCard>
          <ChartCard title="Sin datos" isEmpty>
            <div />
          </ChartCard>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">DataTable</h3>
        <DataTable
          columns={COLUMNS}
          rows={filteredRows}
          getRowId={(row) => row.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar persona…"
          sort={sort}
          onSortChange={setSort}
          caption="Personas registradas"
          pagination={
            <Pagination
              page={page}
              pageSize={4}
              total={filteredRows.length}
              onPageChange={setPage}
            />
          }
        />
      </div>
    </div>
  );
}
