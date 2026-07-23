'use client';

import { CalendarDays, Network, UserPlus, Users } from 'lucide-react';

export interface AttendanceSummary {
  fecha: string;
  totalAsistentes: number;
  totalNuevos: number;
}

export interface AttendanceRedSummary {
  idRed: string | null;
  nombreRed: string | null;
  totalAsistentes: number;
}

interface AttendanceSummaryPanelProps {
  hasSelectedDate: boolean;
  summary: AttendanceSummary | null;
  redSummary: AttendanceRedSummary[];
  primaryFirst?: boolean;
}

export function AttendanceSummaryPanel({
  hasSelectedDate,
  summary,
  redSummary,
  primaryFirst = false,
}: AttendanceSummaryPanelProps) {
  const sinRed = redSummary.find((item) => !item.idRed);

  if (!hasSelectedDate) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        Seleccioná una fecha para cargar el resumen y los registros de asistencia.
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="mb-5 space-y-4">
      {primaryFirst && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Fecha seleccionada
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">{summary.fecha}</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">Resumen del día seleccionado</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                  Personas atendidas
                </p>
                <p className="mt-3 text-3xl font-bold">{summary.totalAsistentes}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-2.5">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-200">Total de asistentes en la fecha</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {!primaryFirst && (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                  Total asistentes
                </p>
                <p className="mt-3 text-3xl font-bold">{summary.totalAsistentes}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-2.5">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-200">Fecha seleccionada: {summary.fecha}</p>
          </div>
        )}

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-4 text-amber-950 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Nuevos asistentes
              </p>
              <p className="mt-3 text-3xl font-bold">{summary.totalNuevos}</p>
            </div>
            <div className="rounded-xl bg-white/60 p-2.5 text-amber-700">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-xs text-amber-700">
            Personas nuevas registradas en la fecha seleccionada
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-100 p-4 text-emerald-950 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Redes con asistencia
              </p>
              <p className="mt-3 text-3xl font-bold">{redSummary.length}</p>
            </div>
            <div className="rounded-xl bg-white/60 p-2.5 text-emerald-700">
              <Network className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-xs text-emerald-700">
            Incluye agrupación por red para la misma fecha
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Asistencia por red</h3>
            <p className="text-xs text-slate-500">Distribución de asistentes en la fecha seleccionada</p>
          </div>
        </div>

        {redSummary.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
            No hay asistentes registrados para esta fecha.
          </div>
        ) : (
          <div className="space-y-3">
            {sinRed && sinRed.totalAsistentes > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {sinRed.totalAsistentes} persona{sinRed.totalAsistentes === 1 ? '' : 's'} aún no tiene{sinRed.totalAsistentes === 1 ? '' : 'n'} una red asignada en el sistema.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {redSummary.map((item) => (
                <div
                  key={item.idRed ?? 'sin-red'}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.nombreRed?.trim() || 'Sin red'}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        Asistentes
                      </p>
                    </div>
                    <span className="inline-flex min-w-10 justify-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                      {item.totalAsistentes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
