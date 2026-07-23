'use client';

export interface DominicalMonthlyAttendance {
  mes: string;
  totalAsistentes: number;
  totalNuevos: number;
}

interface DominicalMonthlyAttendanceChartsProps {
  data: DominicalMonthlyAttendance[];
  loading: boolean;
  error: string | null;
}

function formatMonthLabel(mes: string): string {
  const [year, month] = mes.split('-').map(Number);

  if (!year || !month) {
    return mes;
  }

  return new Intl.DateTimeFormat('es-CO', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '');
}

function getBarHeight(value: number, maximum: number): string {
  if (value <= 0) {
    return '0%';
  }

  return `${Math.max((value / maximum) * 100, 6)}%`;
}

export function DominicalMonthlyAttendanceCharts({
  data,
  loading,
  error,
}: DominicalMonthlyAttendanceChartsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Cargando asistencia mensual...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        No hay registros suficientes para mostrar la asistencia mensual.
      </div>
    );
  }

  const maximum = Math.max(
    1,
    ...data.map((item) => Math.max(item.totalAsistentes, item.totalNuevos)),
  );

  return (
    <section
      aria-labelledby="dominical-monthly-attendance-title"
      className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            id="dominical-monthly-attendance-title"
            className="text-sm font-semibold text-slate-900"
          >
            Asistencia por mes
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Comparación histórica de asistentes totales y nuevos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600" aria-label="Leyenda">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" aria-hidden="true" />
            Total asistentes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" />
            Nuevos asistentes
          </span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-end gap-3" role="list" aria-label="Asistencia mensual">
          {data.map((item) => {
            const monthLabel = formatMonthLabel(item.mes);

            return (
              <div
                key={item.mes}
                className="flex w-16 flex-col items-center gap-2 sm:w-20"
                role="listitem"
              >
                <div className="flex h-44 w-full items-end justify-center gap-1 border-b border-slate-300">
                  <div
                    className="w-5 rounded-t-md bg-slate-900 transition-[height] sm:w-6"
                    style={{ height: getBarHeight(item.totalAsistentes, maximum) }}
                    role="img"
                    aria-label={`${monthLabel}: ${item.totalAsistentes} asistentes totales`}
                  />
                  <div
                    className="w-5 rounded-t-md bg-amber-500 transition-[height] sm:w-6"
                    style={{ height: getBarHeight(item.totalNuevos, maximum) }}
                    role="img"
                    aria-label={`${monthLabel}: ${item.totalNuevos} asistentes nuevos`}
                  />
                </div>
                <span className="text-center text-[11px] font-medium capitalize text-slate-600">
                  {monthLabel}
                </span>
                <div className="flex gap-2 text-[11px] text-slate-500" aria-hidden="true">
                  <span>{item.totalAsistentes}</span>
                  <span>{item.totalNuevos}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
