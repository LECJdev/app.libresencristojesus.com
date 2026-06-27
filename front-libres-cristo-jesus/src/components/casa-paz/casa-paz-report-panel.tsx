'use client';

import type { ReactNode } from 'react';
import type {
  CasaPazEncounterCandidateItem,
  CasaPazReportResponse,
} from '@/lib/casa-paz-reports';
import { formatCurrency, formatDateLabel } from '@/lib/casa-paz-reports';
import { BarChart3, Coins, Home, UserPlus, Users } from 'lucide-react';

interface CasaPazReportPanelProps {
  title: string;
  description: string;
  report: CasaPazReportResponse | null;
  loading?: boolean;
  emptyMessage?: string;
  candidateLimit?: number;
}

function formatScopeLabel(scope: CasaPazReportResponse['scope']) {
  switch (scope) {
    case 'global':
      return 'Global';
    case 'scoped':
      return 'Según acceso';
    case 'link':
      return 'Por enlace';
    default:
      return scope;
  }
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function DistributionList<TItem>({
  title,
  items,
  getKey,
  getLabel,
  getValue,
}: {
  title: string;
  items: TItem[];
  getKey: (item: TItem) => string;
  getLabel: (item: TItem) => string;
  getValue: (item: TItem) => number;
}) {
  const maxValue = Math.max(...items.map(getValue), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No hay datos disponibles para el filtro seleccionado.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const value = getValue(item);
            const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 8) : 0;

            return (
              <div key={getKey(item)} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-slate-800">{getLabel(item)}</span>
                  <span className="text-slate-500">{value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-slate-900" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EncounterCandidatesTable({
  candidates,
  limit,
}: {
  candidates: CasaPazEncounterCandidateItem[];
  limit: number;
}) {
  const visibleCandidates = candidates.slice(0, limit);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Posibles candidatos a encuentro</h3>
          <p className="text-xs text-slate-500">Personas que asistieron a Casa de Paz y aún no tienen el encuentro confirmado.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          {candidates.length} en total
        </span>
      </div>

      {visibleCandidates.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No hay candidatos a encuentro dentro del alcance actual.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Persona</th>
                <th className="px-3 py-2 font-semibold">Red</th>
                <th className="px-3 py-2 font-semibold">Asistencias</th>
                <th className="px-3 py-2 font-semibold">Casas de Paz</th>
                <th className="px-3 py-2 font-semibold">Primera asistencia</th>
                <th className="px-3 py-2 font-semibold">Última asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {visibleCandidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">
                      {`${candidate.nombres || ''} ${candidate.apellidos || ''}`.trim() || candidate.id}
                    </div>
                    <div className="text-xs text-slate-500">
                      {candidate.documento || 'Sin documento'} · {candidate.celular || 'Sin celular'}
                    </div>
                  </td>
                  <td className="px-3 py-3">{candidate.redName || 'Sin red asignada'}</td>
                  <td className="px-3 py-3">{candidate.attendanceCount}</td>
                  <td className="px-3 py-3">{candidate.linksCount}</td>
                  <td className="px-3 py-3">{formatDateLabel(candidate.firstAttendanceDate)}</td>
                  <td className="px-3 py-3">{formatDateLabel(candidate.lastAttendanceDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CasaPazReportPanel({
  title,
  description,
  report,
  loading = false,
  emptyMessage = 'Aún no hay datos disponibles para este reporte.',
  candidateLimit = 6,
}: CasaPazReportPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {report ? (
          <div className="text-xs text-slate-500">
            Alcance: <span className="font-medium text-slate-700">{formatScopeLabel(report.scope)}</span>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-500">
          Cargando datos del reporte...
        </div>
      ) : !report ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Casas de Paz"
              value={`${report.summary.activeLinks}/${report.summary.totalLinks}`}
              hint={`${report.summary.linksWithAttendance} registraron asistencia en el rango seleccionado.`}
              icon={<Home className="h-5 w-5" />}
            />
            <MetricCard
              label="Asistencia"
              value={report.summary.attendanceTotal}
              hint={`${report.summary.uniquePeopleReached} personas únicas alcanzadas.`}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="Personas nuevas"
              value={report.summary.newPeopleTotal}
              hint={`${report.summary.possibleEncounterCandidates} posibles candidatos a encuentro.`}
              icon={<UserPlus className="h-5 w-5" />}
            />
            <MetricCard
              label="Ofrenda"
              value={formatCurrency(report.summary.offeringTotal)}
              hint={`${report.summary.sessionCount} sesiones registradas.`}
              icon={<Coins className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DistributionList
              title="Asistencia por Casa de Paz"
              items={report.attendanceByLink}
              getKey={(item) => item.id}
              getLabel={(item) => item.nombre}
              getValue={(item) => item.attendanceTotal}
            />
            <DistributionList
              title="Asistencia por red"
              items={report.attendanceByRed}
              getKey={(item) => item.idRed ?? 'unassigned'}
              getLabel={(item) => item.nombreRed || 'Red sin asignar'}
              getValue={(item) => item.attendanceTotal}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Asistencia por fecha</h3>
                <p className="text-xs text-slate-500">Totales diarios de asistencia, sesiones y ofrenda.</p>
              </div>
            </div>

            {report.attendanceByDate.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No se encontró actividad por fecha para el filtro seleccionado.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Fecha</th>
                      <th className="px-3 py-2 font-semibold">Asistencia</th>
                      <th className="px-3 py-2 font-semibold">Únicas</th>
                      <th className="px-3 py-2 font-semibold">Nuevas</th>
                      <th className="px-3 py-2 font-semibold">Sesiones</th>
                      <th className="px-3 py-2 font-semibold">Ofrenda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {report.attendanceByDate.map((item) => (
                      <tr key={item.fecha}>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900">{item.dayLabel}</div>
                          <div className="text-xs text-slate-500">{item.fecha}</div>
                        </td>
                        <td className="px-3 py-3">{item.attendanceTotal}</td>
                        <td className="px-3 py-3">{item.uniquePeopleReached}</td>
                        <td className="px-3 py-3">{item.newPeopleTotal}</td>
                        <td className="px-3 py-3">{item.sessionCount}</td>
                        <td className="px-3 py-3">{formatCurrency(item.offeringTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <EncounterCandidatesTable candidates={report.encounterCandidates} limit={candidateLimit} />
        </div>
      )}
    </section>
  );
}
