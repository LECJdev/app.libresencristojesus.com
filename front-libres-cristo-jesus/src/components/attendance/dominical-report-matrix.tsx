'use client';

import {
  buildDominicalMatrixRows,
  formatDominicalDateLabel,
  getDominicalPersonName,
  getDominicalReportDates,
  type DominicalReportResponse,
} from '@/lib/dominical-report';

interface DominicalReportMatrixProps {
  report: DominicalReportResponse | null;
  loading: boolean;
  onPersonDetail: (personId: string) => void;
}

export function DominicalReportMatrix({
  report,
  loading,
  onPersonDetail,
}: DominicalReportMatrixProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
        Cargando matriz de asistencia...
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const dates = getDominicalReportDates(report);
  const rows = buildDominicalMatrixRows(report);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Matriz de personas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Cada fila representa una persona registrada en el rango seleccionado.
          </p>
        </div>
        <span className="shrink-0 text-sm text-slate-500">
          {rows.length} personas · {dates.length} fechas
        </span>
      </div>

      {rows.length === 0 || dates.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No hay personas o fechas registradas en el rango seleccionado.
        </p>
      ) : (
        <>
          <div className="mt-5 space-y-3 lg:hidden">
            {rows.map((row) => (
              <article key={row.person.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Persona #{row.rowNumber}
                    </p>
                    <h3 className="mt-1 break-words font-semibold text-slate-900">
                      {getDominicalPersonName(row.person)}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPersonDetail(row.person.id)}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50"
                  >
                    Ver detalle
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {row.attendance.map((attended, index) => {
                    const date = dates[index];
                    const dateLabel = formatDominicalDateLabel(date);

                    return (
                      <div key={date} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                        <dt className="break-words text-xs font-medium text-slate-600">{dateLabel}</dt>
                        <dd
                          className={`mt-1 text-sm font-semibold ${
                            attended ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                          aria-label={`${dateLabel}: ${attended ? 'asistió' : 'ausente'}`}
                        >
                          {attended ? '✓ Asistió' : '— Ausente'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-5 hidden min-w-0 max-w-full lg:block">
            <p className="mb-2 text-xs text-slate-500">
              Deslizá horizontalmente para consultar todas las fechas.
            </p>
            <div className="max-w-full overflow-x-auto pb-2">
              <div className="min-w-full rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <tr>
                      <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3 text-center font-semibold">#</th>
                      <th className="sticky left-10 z-10 min-w-56 bg-slate-50 px-3 py-3 font-semibold">Persona</th>
                      <th className="sticky left-[16.5rem] z-10 bg-slate-50 px-3 py-3 font-semibold">Detalle</th>
                      {dates.map((date) => (
                        <th key={date} className="min-w-28 px-3 py-3 text-center font-semibold">
                          {formatDominicalDateLabel(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {rows.map((row) => (
                      <tr key={row.person.id} className="transition-colors hover:bg-slate-50">
                        <td className="sticky left-0 z-[1] bg-white px-3 py-3 text-center text-slate-500">
                          {row.rowNumber}
                        </td>
                        <td className="sticky left-10 z-[1] bg-white px-3 py-3 font-medium text-slate-900">
                          {getDominicalPersonName(row.person)}
                        </td>
                        <td className="sticky left-[16.5rem] z-[1] bg-white px-3 py-3">
                          <button
                            type="button"
                            onClick={() => onPersonDetail(row.person.id)}
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500 hover:bg-slate-50 lg:min-h-9"
                          >
                            Ver detalle
                          </button>
                        </td>
                        {row.attendance.map((attended, index) => {
                          const date = dates[index];

                          return (
                            <td
                              key={date}
                              className="px-3 py-3 text-center"
                              aria-label={`${formatDominicalDateLabel(date)}: ${attended ? 'asistió' : 'ausente'}`}
                            >
                              {attended ? (
                                <span className="text-lg font-bold text-emerald-600" aria-label="Asistió">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-lg text-slate-300" aria-label="Ausente">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
