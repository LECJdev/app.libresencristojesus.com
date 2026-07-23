'use client';

import { useEffect, useMemo, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { apiClient } from '@/lib/api';
import { CasaPazReportPanel } from '@/components/casa-paz/casa-paz-report-panel';
import { useAuth } from '@/hooks/useAuth';
import { normalizeAttendanceDateOptions } from '@/lib/attendance-date';
import {
  getCurrentMonthValue,
  type CasaPazReportResponse,
} from '@/lib/casa-paz-reports';
import {
  buildCasaPazReportExportParams,
  downloadCasaPazReport,
  type CasaPazReportExportResponse,
} from '@/lib/casa-paz-report-export';
import {
  AttendanceSummaryPanel,
  type AttendanceRedSummary,
  type AttendanceSummary,
} from '@/components/attendance/attendance-summary-panel';
import { ArrowLeft, ExternalLink, QrCode, Search } from 'lucide-react';
import { QRCode } from 'react-qrcode-logo';

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem('LC_AUTH_TOKEN')?.trim() ?? '';
}

type EstadoAsistenciaCasaPaz = 'ACTIVO' | 'INACTIVO';
type DiaPredica =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

interface AsistenciaCasaPaz {
  id: string;
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaCasaPaz;
  qrToken: string;
  direccionCasa: string;
  red: { id: string; nombre: string | null };
  personaACargo: PersonaResumen | null;
  anfitrion: PersonaResumen | null;
  liderPrincipal: PersonaResumen | null;
}

interface PersonaResumen {
  id: string;
  nombres: string | null;
  apellidos: string | null;
}

interface RegistroAsistencia {
  id: string;
  fechaRegistro: string;
  esNuevo: boolean;
  persona: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    documento: string | null;
    celular: string | null;
  };
}

interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type FechasDisponiblesResponse = string[];

interface CasaPazSesion {
  fecha: string;
  montoOfrenda: number;
  exists: boolean;
}

export default function DetalleAsistenciaCasaPazPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { loading: authLoading, logout, user } = useAuth();

  const [asistencia, setAsistencia] = useState<AsistenciaCasaPaz | null>(null);
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [resumen, setResumen] = useState<AttendanceSummary | null>(null);
  const [resumenPorRed, setResumenPorRed] = useState<AttendanceRedSummary[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([]);
  const [sesion, setSesion] = useState<CasaPazSesion | null>(null);
  const [montoOfrenda, setMontoOfrenda] = useState('');
  const [savingSessionAmounts, setSavingSessionAmounts] = useState(false);
  const [hasDetailAccess, setHasDetailAccess] = useState<boolean | null>(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthValue());
  const [detailReport, setDetailReport] = useState<CasaPazReportResponse | null>(null);
  const [loadingDetailReport, setLoadingDetailReport] = useState(true);
  const [exportingReport, setExportingReport] = useState(false);
  const baseRequestIdRef = useRef(0);
  const registrosRequestIdRef = useRef(0);
  const sesionRequestIdRef = useRef(0);
  const detailReportRequestIdRef = useRef(0);
  const exportRequestIdRef = useRef(0);
  const sessionInvalidatedRef = useRef(false);

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [fecha, setFecha] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const publicUrl = useMemo(() => {
    if (!asistencia) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/asistencia/casa-paz/${asistencia.qrToken}`;
  }, [asistencia]);

  const hasFechaSeleccionada = fecha !== '';

  const invalidateSession = () => {
    if (sessionInvalidatedRef.current) {
      return;
    }

    sessionInvalidatedRef.current = true;
    baseRequestIdRef.current += 1;
    registrosRequestIdRef.current += 1;
    sesionRequestIdRef.current += 1;
    detailReportRequestIdRef.current += 1;
    exportRequestIdRef.current += 1;
    logout();
  };

  const requireAuthenticatedSession = () => {
    if (authLoading || sessionInvalidatedRef.current) {
      return false;
    }

    if (!user || !getStoredAuthToken()) {
      invalidateSession();
      return false;
    }

    return true;
  };

  const getErrorStatus = (error: unknown): number | null => {
    if (typeof error !== 'object' || error === null) {
      return null;
    }

    if (!('response' in error)) {
      return null;
    }

    const response = (error as { response?: { status?: number } }).response;
    return typeof response?.status === 'number' ? response.status : null;
  };

  const fetchBaseData = async () => {
    if (!requireAuthenticatedSession()) {
      return;
    }

    const requestId = ++baseRequestIdRef.current;
    setLoadingBase(true);
    setHasDetailAccess(null);
    try {
      const [asistenciaRes, fechasRes] = await Promise.all([
        apiClient.get<AsistenciaCasaPaz>(`/asistencias-casa-paz/${resolvedParams.id}`),
        apiClient.get<FechasDisponiblesResponse>(
          `/asistencias-casa-paz/${resolvedParams.id}/registros/fechas`,
        ),
      ]);

      if (requestId !== baseRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setAsistencia(asistenciaRes.data);
      setFechasDisponibles(normalizeAttendanceDateOptions(fechasRes.data));
      setHasDetailAccess(true);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      if (requestId !== baseRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      console.error(error);
      setAsistencia(null);
      setFechasDisponibles([]);
      setHasDetailAccess(false);

      const status = getErrorStatus(error);

      if (status === 403 || status === 404) {
        alert('El detalle de esta Casa de Paz no está disponible para tu cuenta.');
        router.replace('/admin/asistencias/casa-paz');
        return;
      }

      alert('Error al cargar el detalle de la asistencia');
    } finally {
      if (requestId === baseRequestIdRef.current && !sessionInvalidatedRef.current) {
        setLoadingBase(false);
      }
    }
  };

  const fetchRegistros = async () => {
    if (!requireAuthenticatedSession()) {
      return;
    }

    const requestId = ++registrosRequestIdRef.current;

    if (!hasFechaSeleccionada || hasDetailAccess !== true || !asistencia) {
      if (requestId !== registrosRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setRegistros([]);
      setResumen(null);
      setResumenPorRed([]);
      setTotalPages(1);
      setSesion(null);
      setMontoOfrenda('');
      return;
    }

    setLoadingRegistros(true);
    try {
      const [registrosRes, resumenRes, resumenPorRedRes] = await Promise.all([
        apiClient.get<PagedResponse<RegistroAsistencia>>(
          `/asistencias-casa-paz/${resolvedParams.id}/registros`,
          {
            params: {
              search: submittedSearch,
              soloNuevos,
              fecha,
              page,
              limit: 10,
            },
          },
        ),
        apiClient.get<AttendanceSummary>(
          `/asistencias-casa-paz/${resolvedParams.id}/registros/resumen`,
          {
            params: { fecha },
          },
        ),
        apiClient.get<AttendanceRedSummary[]>(
          `/asistencias-casa-paz/${resolvedParams.id}/registros/resumen-por-red`,
          {
            params: { fecha },
          },
        ),
      ]);

      if (requestId !== registrosRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setRegistros(registrosRes.data.data);
      setResumen(resumenRes.data);
      setResumenPorRed(resumenPorRedRes.data);
      setTotalPages(registrosRes.data.totalPages || 1);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      if (requestId !== registrosRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      console.error(error);
      alert('Error cargando el detalle de asistencia');
    } finally {
      if (requestId === registrosRequestIdRef.current && !sessionInvalidatedRef.current) {
        setLoadingRegistros(false);
      }
    }
  };

  const fetchSesion = async () => {
    if (!requireAuthenticatedSession()) {
      return;
    }

    const requestId = ++sesionRequestIdRef.current;

    if (!hasFechaSeleccionada || hasDetailAccess !== true || !asistencia) {
      if (requestId !== sesionRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setSesion(null);
      setMontoOfrenda('');
      return;
    }

    try {
      const { data } = await apiClient.get<CasaPazSesion>(
        `/asistencias-casa-paz/${resolvedParams.id}/sesion`,
        { params: { fecha } },
      );

      if (requestId !== sesionRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setSesion(data);
      setMontoOfrenda(data.exists || data.montoOfrenda > 0 ? String(data.montoOfrenda) : '');
    } catch (error) {
      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      if (requestId !== sesionRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      console.error(error);
      alert('Error al cargar los valores de la sesión seleccionada');
    }
  };

  const invalidateDetailReport = () => {
    const requestId = ++detailReportRequestIdRef.current;
    exportRequestIdRef.current += 1;
    setDetailReport(null);
    setLoadingDetailReport(true);
    setExportingReport(false);
    return requestId;
  };

  const fetchDetailReport = async () => {
    if (!requireAuthenticatedSession()) {
      return;
    }

    const requestId = invalidateDetailReport();

    if (hasDetailAccess !== true || !asistencia) {
      setLoadingDetailReport(false);
      return;
    }

    try {
      const { data } = await apiClient.get<CasaPazReportResponse>(
        `/asistencias-casa-paz/${resolvedParams.id}/reportes`,
        {
          params: { month: reportMonth },
        },
      );

      if (requestId !== detailReportRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setDetailReport(data);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      if (requestId !== detailReportRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      console.error(error);
      alert('Error al cargar el reporte detallado de Casa de Paz');
    } finally {
      if (
        requestId === detailReportRequestIdRef.current &&
        !sessionInvalidatedRef.current
      ) {
        setLoadingDetailReport(false);
      }
    }
  };

  const handleExportReport = async (report: CasaPazReportResponse | null) => {
    if (!report || !requireAuthenticatedSession()) {
      return;
    }

    const reportRequestId = detailReportRequestIdRef.current;
    const exportRequestId = ++exportRequestIdRef.current;
    setExportingReport(true);
    try {
      const { data } = await apiClient.get<CasaPazReportExportResponse>(
        `/asistencias-casa-paz/${resolvedParams.id}/reportes/export-rows`,
        {
          params: buildCasaPazReportExportParams(report),
        },
      );

      if (
        reportRequestId !== detailReportRequestIdRef.current ||
        exportRequestId !== exportRequestIdRef.current ||
        sessionInvalidatedRef.current
      ) {
        return;
      }

      downloadCasaPazReport(data);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      if (
        reportRequestId !== detailReportRequestIdRef.current ||
        exportRequestId !== exportRequestIdRef.current ||
        sessionInvalidatedRef.current
      ) {
        return;
      }

      console.error(error);
      alert('Error al exportar el reporte de Casa de Paz');
    } finally {
      if (exportRequestId === exportRequestIdRef.current && !sessionInvalidatedRef.current) {
        setExportingReport(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchBaseData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, resolvedParams.id, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchRegistros();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authLoading,
    resolvedParams.id,
    page,
    soloNuevos,
    fecha,
    submittedSearch,
    hasFechaSeleccionada,
    hasDetailAccess,
    user,
  ]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchSesion();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, resolvedParams.id, fecha, hasFechaSeleccionada, hasDetailAccess, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchDetailReport();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, resolvedParams.id, reportMonth, hasDetailAccess, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(search);
  };

  const normalizeAmountInput = (value: string) => {
    if (!value.trim()) {
      return 0;
    }

    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      return null;
    }

    return parsedValue;
  };

  const handleSaveSessionAmounts = async () => {
    if (!hasFechaSeleccionada) {
      alert('Selecciona una fecha de reunión antes de guardar los valores');
      return;
    }

    const parsedOffering = normalizeAmountInput(montoOfrenda);

    if (parsedOffering === null) {
      alert('Ingresa un valor de ofrenda válido que no sea negativo');
      return;
    }

    if (!requireAuthenticatedSession()) {
      return;
    }

    const requestId = ++sesionRequestIdRef.current;
    setSavingSessionAmounts(true);
    try {
      const { data } = await apiClient.put<CasaPazSesion>(
        `/asistencias-casa-paz/${resolvedParams.id}/sesion`,
        {
          fecha,
          montoOfrenda: parsedOffering,
        },
      );

      if (requestId !== sesionRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setSesion(data);
      setMontoOfrenda(String(data.montoOfrenda));
      setFechasDisponibles((current) =>
        normalizeAttendanceDateOptions(
          current.includes(data.fecha) ? current : [...current, data.fecha],
        ),
      );
    } catch (error) {
      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      if (requestId !== sesionRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      console.error(error);
      alert('Error al guardar los valores de la sesión');
    } finally {
      if (requestId === sesionRequestIdRef.current && !sessionInvalidatedRef.current) {
        setSavingSessionAmounts(false);
      }
    }
  };

  const formatPersonaName = (persona: PersonaResumen | null) => {
    if (!persona) return '—';
    const fullName = `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
    if (fullName) return fullName;
    return persona.id;
  };

  if (loadingBase && !asistencia) {
    return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando detalle...</div>;
  }

  if (!asistencia) {
    return <div className="p-4 text-center text-red-500 sm:p-6 lg:p-8">Asistencia no encontrada.</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start gap-3 sm:items-center">
        <Link
          href="/admin/asistencias/casa-paz"
          className="p-2 rounded-md border border-slate-300 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {asistencia.nombre}
          </h1>
          <p className="text-slate-500 text-sm">
            Red: {asistencia.red?.nombre || '—'} · Dirección: {asistencia.direccionCasa} · Día:{' '}
            {asistencia.diaRegistro} · Estado: {asistencia.estado}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">QR único</h2>

          {publicUrl && (
            <div className="flex flex-col items-center">
              <div className="bg-slate-50 p-4 rounded-xl mb-4">
                <QRCode
                  value={publicUrl}
                  size={220}
                  qrStyle="dots"
                  eyeRadius={8}
                  fgColor="#0f172a"
                  id="qr-casa-paz"
                />
              </div>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-4 w-4" /> Ir al enlace público
              </a>
              <code className="mt-3 text-xs text-slate-500 break-all text-center">
                {publicUrl}
              </code>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Roles asignados</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Persona a cargo
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatPersonaName(asistencia.personaACargo)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Anfitrión
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatPersonaName(asistencia.anfitrion)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Líder principal
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatPersonaName(asistencia.liderPrincipal)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filtro del reporte por Casa de Paz</h2>
                <p className="text-sm text-slate-500">
                  Revisa el desempeño mensual de esta Casa de Paz.
                </p>
              </div>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium">Mes</span>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => {
                    invalidateDetailReport();
                    setReportMonth(e.target.value);
                  }}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>
            </div>

            <CasaPazReportPanel
              title="Reporte por Casa de Paz"
              description={`Métricas de asistencia, sesiones, ofrenda y encuentros para ${reportMonth}.`}
              report={detailReport}
              loading={loadingDetailReport}
              candidateLimit={4}
              onExport={() => void handleExportReport(detailReport)}
              exporting={exportingReport}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Valores de la sesión</h2>
                <p className="text-sm text-slate-500">
                  Selecciona o ingresa una fecha de reunión para guardar el valor de la ofrenda.
                </p>
              </div>
              {hasFechaSeleccionada && sesion?.exists && (
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Valores guardados
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de reunión</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setPage(1);
                  }}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Valor de la ofrenda</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoOfrenda}
                  onChange={(e) => setMontoOfrenda(e.target.value)}
                  placeholder="0"
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>
              <button
                type="button"
                disabled={savingSessionAmounts}
                onClick={handleSaveSessionAmounts}
                className="min-h-11 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingSessionAmounts ? 'Guardando...' : 'Guardar ofrenda'}
              </button>
            </div>

            {!hasFechaSeleccionada && (
              <p className="mt-3 text-sm text-slate-500">
                Selecciona una fecha para registrar los valores de la sesión.
              </p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-slate-900">Personas registradas</h2>
              <span className="text-sm text-slate-500">
                {hasFechaSeleccionada ? `${registros.length} en esta página` : 'Selecciona una fecha'}
              </span>
            </div>

          <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, documento o celular"
                disabled={!hasFechaSeleccionada}
                className="min-h-11 w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <select
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setPage(1);
              }}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 md:w-52"
            >
              <option value="">Selecciona una fecha</option>
              {fechasDisponibles.map((fechaDisponible) => (
                <option key={fechaDisponible} value={fechaDisponible}>
                  {fechaDisponible}
                </option>
              ))}
            </select>
            <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 md:justify-center">
              <input
                type="checkbox"
                checked={soloNuevos}
                disabled={!hasFechaSeleccionada}
                onChange={(e) => {
                  setSoloNuevos(e.target.checked);
                  setPage(1);
                }}
              />
              Solo nuevos
            </label>
            <button
              type="submit"
              disabled={!hasFechaSeleccionada}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 md:w-auto"
            >
              Filtrar
            </button>
          </form>

          <AttendanceSummaryPanel
            hasSelectedDate={hasFechaSeleccionada}
            summary={resumen}
            redSummary={resumenPorRed}
          />

          <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div className="min-w-full rounded-md border border-slate-200">
              <table className="min-w-[680px] w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Persona</th>
                    <th className="px-4 py-3 font-semibold">Documento</th>
                    <th className="px-4 py-3 font-semibold">Celular</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loadingRegistros ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Cargando registros...
                      </td>
                    </tr>
                  ) : !hasFechaSeleccionada ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Seleccioná una fecha para ver los registros.
                      </td>
                    </tr>
                  ) : registros.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No hay personas registradas con este filtro.
                      </td>
                    </tr>
                  ) : (
                    registros.map((registro) => (
                      <tr key={registro.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {registro.persona?.nombres || ''} {registro.persona?.apellidos || ''}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {registro.persona?.documento || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {registro.persona?.celular || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-semibold ${
                              registro.esNuevo
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {registro.esNuevo ? 'NUEVA' : 'EXISTENTE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{registro.fechaRegistro}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasFechaSeleccionada || page === 1}
              className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-slate-600">
              {hasFechaSeleccionada
                ? `Página ${page} de ${Math.max(totalPages, 1)}`
                : 'Esperando selección de fecha'}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasFechaSeleccionada || page >= totalPages}
              className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
        </div>
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <QrCode className="h-3.5 w-3.5" />
        El QR se mantiene fijo por asistencia; solo cambia la fecha de registro al escanear.
      </div>
    </div>
  );
}
