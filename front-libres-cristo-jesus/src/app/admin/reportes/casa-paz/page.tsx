'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { CasaPazReportPanel } from '@/components/casa-paz/casa-paz-report-panel';
import TableScrollHint from '@/components/TableScrollHint';
import { useAuth } from '@/hooks/useAuth';
import {
  getCurrentMonthValue,
  getCurrentDateValue,
  type CasaPazEncounterCandidatesReportResponse,
  type CasaPazReportResponse,
} from '@/lib/casa-paz-reports';
import {
  buildCasaPazReportExportParams,
  downloadCasaPazReport,
  type CasaPazReportExportResponse,
} from '@/lib/casa-paz-report-export';

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem('LC_AUTH_TOKEN')?.trim() ?? '';
}

export default function CasaPazReportsPage() {
  const { loading: authLoading, logout, user } = useAuth();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [date, setDate] = useState(getCurrentDateValue());
  const [monthlyReport, setMonthlyReport] = useState<CasaPazReportResponse | null>(null);
  const [dailyReport, setDailyReport] = useState<CasaPazReportResponse | null>(null);
  const [candidateReport, setCandidateReport] =
    useState<CasaPazEncounterCandidatesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const reportRequestIdRef = useRef(0);
  const exportRequestIdRef = useRef(0);

  const invalidateReports = () => {
    const requestId = ++reportRequestIdRef.current;
    exportRequestIdRef.current += 1;
    setMonthlyReport(null);
    setDailyReport(null);
    setCandidateReport(null);
    setLoading(true);
    setExporting(false);
    return requestId;
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const fetchReports = async () => {
      const requestId = invalidateReports();

      if (!user || !getStoredAuthToken()) {
        setSessionError('Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar los reportes.');
        setLoading(false);
        return;
      }

      setSessionError(null);
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

        if (requestId !== reportRequestIdRef.current) {
          return;
        }

        setMonthlyReport(monthlyData);
        setDailyReport(dailyData);
        setCandidateReport(candidatesData);
      } catch (error) {
        if (requestId !== reportRequestIdRef.current) {
          return;
        }

        console.error(error);

        if (isUnauthorizedError(error)) {
          setSessionError(
            'Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar los reportes.',
          );
          logout();
          return;
        }

        alert('Error al cargar los reportes de Casa de Paz');
      } finally {
        if (requestId === reportRequestIdRef.current) {
          setLoading(false);
        }
      }
    };

    void fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, date, month, user]);

  const handleExport = async (report: CasaPazReportResponse | null) => {
    if (!report) {
      return;
    }

    if (!user || !getStoredAuthToken()) {
      setSessionError(
        'Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar los reportes.',
      );
      return;
    }

    const reportRequestId = reportRequestIdRef.current;
    const exportRequestId = ++exportRequestIdRef.current;
    setExporting(true);
    try {
      const { data } = await apiClient.get<CasaPazReportExportResponse>(
        '/asistencias-casa-paz/reportes/export-rows',
        {
          params: buildCasaPazReportExportParams(report),
        },
      );

      if (
        reportRequestId !== reportRequestIdRef.current ||
        exportRequestId !== exportRequestIdRef.current
      ) {
        return;
      }

      downloadCasaPazReport(data);
    } catch (error) {
      if (
        reportRequestId !== reportRequestIdRef.current ||
        exportRequestId !== exportRequestIdRef.current
      ) {
        return;
      }

      console.error(error);

      if (isUnauthorizedError(error)) {
        setSessionError(
          'Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar los reportes.',
        );
        logout();
        return;
      }

      alert('Error al exportar el reporte de Casa de Paz');
    } finally {
      if (exportRequestId === exportRequestIdRef.current) {
        setExporting(false);
      }
    }
  };

  const sessionUnavailable =
    !authLoading && (!user || !getStoredAuthToken());

  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Libres en Cristo Jesús
          </p>
          <h1 className="break-words text-xl font-semibold text-gray-800">Reportes de Casa de Paz</h1>
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto min-w-0 max-w-7xl">
          <Link
            href="/admin/reportes"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a Reportes
          </Link>

          <div id="casa-de-paz" className="mt-4 mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <BarChart3 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
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
                  onChange={(e) => {
                    invalidateReports();
                    setMonth(e.target.value);
                  }}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium">Reporte diario</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    invalidateReports();
                    setDate(e.target.value);
                  }}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>
            </div>
          </div>

          {sessionError || sessionUnavailable ? (
            <div role="alert" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              {sessionError || 'Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar los reportes.'}
            </div>
          ) : (
            <div className="space-y-6">
              <CasaPazReportPanel
                title="Reporte mensual de Casa de Paz"
                description={`Desempeño de Casa de Paz para ${month} dentro del alcance actual de tu cuenta.`}
                report={monthlyReport}
                loading={loading}
                candidateLimit={8}
                onExport={() => void handleExport(monthlyReport)}
                exporting={exporting}
              />

              <CasaPazReportPanel
                title="Reporte diario de Casa de Paz"
                description={`Resultados de asistencia y sesiones para ${date}.`}
                report={dailyReport}
                loading={loading}
                candidateLimit={8}
                onExport={() => void handleExport(dailyReport)}
                exporting={exporting}
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

                <TableScrollHint />
                <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
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
                            <td className="break-words px-3 py-3 font-medium text-slate-900">
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
          )}
        </div>
      </main>
    </>
  );
}
