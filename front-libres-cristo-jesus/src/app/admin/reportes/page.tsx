'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { CasaPazReportPanel } from '@/components/casa-paz/casa-paz-report-panel';
import {
  getCurrentMonthValue,
  type CasaPazEncounterCandidatesReportResponse,
  type CasaPazReportResponse,
} from '@/lib/casa-paz-reports';

export default function AdminReportes() {
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyReport, setMonthlyReport] = useState<CasaPazReportResponse | null>(null);
  const [dailyReport, setDailyReport] = useState<CasaPazReportResponse | null>(null);
  const [candidateReport, setCandidateReport] =
    useState<CasaPazEncounterCandidatesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [{ data: monthlyData }, { data: dailyData }, { data: candidatesData }] =
          await Promise.all([
            apiClient.get<CasaPazReportResponse>('/asistencias-casa-paz/reportes/mensual', {
              params: { month },
            }),
            apiClient.get<CasaPazReportResponse>('/asistencias-casa-paz/reportes/diario', {
              params: { fecha: date },
            }),
            apiClient.get<CasaPazEncounterCandidatesReportResponse>(
              '/asistencias-casa-paz/reportes/encounter-candidates',
            ),
          ]);

        setMonthlyReport(monthlyData);
        setDailyReport(dailyData);
        setCandidateReport(candidatesData);
      } catch (error) {
        console.error(error);
        alert('Error al cargar los reportes de Casa de Paz');
      } finally {
        setLoading(false);
      }
    };

    void fetchReports();
  }, [date, month]);

  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Libres en Cristo Jesús
          </p>
          <h1 className="text-xl font-semibold text-gray-800">Reportes</h1>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Casa de Paz
              </span>
              <h2 className="mt-2 text-lg font-semibold text-gray-800">Resumen de reportes</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Reporte mensual</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Reporte diario</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <CasaPazReportPanel
            title="Reporte mensual de Casa de Paz"
            description={`Desempeño de Casa de Paz para ${month} dentro del alcance actual de tu cuenta.`}
            report={monthlyReport}
            loading={loading}
            candidateLimit={8}
          />

          <CasaPazReportPanel
            title="Reporte diario de Casa de Paz"
            description={`Resultados de asistencia y sesiones para ${date}.`}
            report={dailyReport}
            loading={loading}
            candidateLimit={8}
          />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pendientes de candidatos a encuentro</h2>
                <p className="text-sm text-slate-500">
                  Personas dentro de tu alcance actual de Casa de Paz que asistieron y aún no tienen el encuentro marcado como completado.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {candidateReport?.total ?? 0} candidatos
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Persona</th>
                    <th className="px-3 py-2 font-semibold">Red</th>
                    <th className="px-3 py-2 font-semibold">Asistencias</th>
                    <th className="px-3 py-2 font-semibold">Casas de Paz</th>
                    <th className="px-3 py-2 font-semibold">Última asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {candidateReport?.candidates.length ? (
                    candidateReport.candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {`${candidate.nombres || ''} ${candidate.apellidos || ''}`.trim() ||
                            candidate.id}
                        </td>
                        <td className="px-3 py-3">{candidate.redName || 'Sin red asignada'}</td>
                        <td className="px-3 py-3">{candidate.attendanceCount}</td>
                        <td className="px-3 py-3">{candidate.linksCount}</td>
                        <td className="px-3 py-3">{candidate.lastAttendanceDate || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        {loading
                          ? 'Cargando candidatos a encuentro...'
                          : 'No hay candidatos a encuentro pendientes en este momento.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
