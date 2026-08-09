'use client';

import {
  buildDominicalDonutGradient,
  buildDominicalRedSegments,
  formatDominicalDateLabel,
  type DominicalReportResponse,
} from '@/lib/dominical-report';

interface DominicalReportChartsProps {
  report: DominicalReportResponse | null;
  loading: boolean;
  error: string | null;
}

function getBarHeight(value: number, maximum: number): string {
  if (value <= 0) {
    return '0%';
  }

  return `${Math.max((value / maximum) * 100, 6)}%`;
}

export function DominicalReportCharts({
  report,
  loading,
  error,
}: DominicalReportChartsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
        Cargando gráficos de asistencia...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const maximum = Math.max(
    1,
    ...report.attendanceByDate.map((item) => item.totalAsistentes),
  );
  const redSegments = buildDominicalRedSegments(report);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Asistencia por domingo</h2>
            <p className="mt-1 text-xs text-slate-500">
              Una barra por cada fecha dominical registrada, no un agregado mensual.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600" aria-label="Leyenda">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" aria-hidden="true" />
              Asistentes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" />
              Nuevos
            </span>
          </div>
        </div>

        {report.attendanceByDate.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No hay fechas registradas en el rango seleccionado.
          </p>
        ) : (
          <div className="mt-5 min-w-0 max-w-full overflow-x-auto pb-2">
            <div
              className="flex min-w-max items-end gap-3"
              role="list"
              aria-label="Asistencia por fecha dominical"
            >
              {report.attendanceByDate.map((item) => {
                const dateLabel = formatDominicalDateLabel(item.fecha);

                return (
                  <div
                    key={item.fecha}
                    className="flex w-20 flex-col items-center gap-2 sm:w-24"
                    role="listitem"
                  >
                    <div className="flex h-48 w-full items-end justify-center border-b border-slate-300">
                      <div
                        className="relative w-9 rounded-t-md bg-slate-900 transition-[height] sm:w-11"
                        style={{ height: getBarHeight(item.totalAsistentes, maximum) }}
                        role="img"
                        aria-label={`${dateLabel}: ${item.totalAsistentes} asistentes`}
                      >
                        {item.totalNuevos > 0 && (
                          <span
                            className="absolute inset-x-0 bottom-0 rounded-t-md bg-amber-500"
                            style={{
                              height: getBarHeight(item.totalNuevos, maximum),
                            }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-center text-[11px] font-medium capitalize text-slate-600">
                      {dateLabel}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.totalAsistentes} total · {item.totalNuevos} nuevos
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">Asistencia por Red</h2>
        <p className="mt-1 text-xs text-slate-500">
          Se usa la Red real de cada Persona. No se infiere pertenencia a Distrito.
        </p>

        {redSegments.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No hay distribución por Red en el rango seleccionado.
          </p>
        ) : (
          <>
            <div className="mt-6 flex justify-center">
              <div
                className="flex h-44 w-44 items-center justify-center rounded-full"
                style={{ background: buildDominicalDonutGradient(redSegments) }}
                role="img"
                aria-label="Distribución de asistencia por Red"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-center text-xs font-semibold text-slate-700 shadow-inner">
                  {report.attendanceByRed.reduce(
                    (sum, item) => sum + item.totalAsistentes,
                    0,
                  )}{' '}
                  asistencias
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              {redSegments.map((segment) => (
                <div key={segment.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2 text-slate-700">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{segment.label}</span>
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {segment.value} ({segment.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
