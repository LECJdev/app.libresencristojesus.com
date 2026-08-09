'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { normalizeAttendanceDateOptions } from '@/lib/attendance-date';
import QrPdfDownload from '@/components/QrPdfDownload';
import {
  DominicalMonthlyAttendanceCharts,
  type DominicalMonthlyAttendance,
} from '@/components/attendance/dominical-monthly-attendance-charts';
import TableScrollHint from '@/components/TableScrollHint';
import { ArrowLeft, Download, ExternalLink, QrCode, Search } from 'lucide-react';
import { handleDominicalExport } from '@/lib/dominical-report-export';
import { QRCode } from 'react-qrcode-logo';

type EstadoAsistenciaDominical = 'ACTIVO' | 'INACTIVO';
type DiaPredica =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

interface AsistenciaDominical {
  id: string;
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaDominical;
  qrToken: string;
  sede: { id: string; nombre: string | null } | null;
}

interface Red {
  id: string;
  nombre: string | null;
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
type PageSize = '100' | '300' | 'all';

export default function DetalleAsistenciaDominicalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  const [asistencia, setAsistencia] = useState<AsistenciaDominical | null>(null);
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [resumenPorMes, setResumenPorMes] = useState<DominicalMonthlyAttendance[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [loadingResumenPorMes, setLoadingResumenPorMes] = useState(true);
  const [errorResumenPorMes, setErrorResumenPorMes] = useState<string | null>(null);
  const [loadingRedes, setLoadingRedes] = useState(true);
  const [redesError, setRedesError] = useState(false);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([]);
  const [redes, setRedes] = useState<Red[]>([]);

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [idRed, setIdRed] = useState('');
  const [fecha, setFecha] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>('100');
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const baseRequestIdRef = useRef(0);
  const resumenPorMesRequestIdRef = useRef(0);
  const registrosRequestIdRef = useRef(0);

  const publicUrl = useMemo(() => {
    if (!asistencia) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/asistencia/dominical/${asistencia.qrToken}`;
  }, [asistencia]);

  const hasFechaSeleccionada = fecha !== '';

  const clearRegistroView = () => {
    setRegistros([]);
    setTotalRegistros(0);
    setTotalPages(1);
  };

  const fetchBaseData = async (requestId: number) => {
    setLoadingBase(true);
    setLoadingRedes(true);
    try {
      const [asistenciaResult, fechasResult, redesResult] = await Promise.allSettled([
        apiClient.get<AsistenciaDominical>(
          `/asistencias-dominicales/${resolvedParams.id}`,
        ),
        apiClient.get<FechasDisponiblesResponse>(
          `/asistencias-dominicales/${resolvedParams.id}/registros/fechas`,
        ),
        apiClient.get<Red[]>('/redes'),
      ]);

      if (requestId !== baseRequestIdRef.current) return;

      if (asistenciaResult.status === 'rejected') {
        throw asistenciaResult.reason;
      }

      if (fechasResult.status === 'rejected') {
        throw fechasResult.reason;
      }

      setAsistencia(asistenciaResult.value.data);
      setFechasDisponibles(normalizeAttendanceDateOptions(fechasResult.value.data));

      if (redesResult.status === 'fulfilled') {
        setRedes(redesResult.value.data);
        setRedesError(false);
      } else {
        console.error(redesResult.reason);
        setRedes([]);
        setRedesError(true);
      }
    } catch (error) {
      if (requestId !== baseRequestIdRef.current) return;

      console.error(error);
      setAsistencia(null);
      setFechasDisponibles([]);
      setRedes([]);
      alert('Error cargando el detalle de asistencia');
    } finally {
      if (requestId === baseRequestIdRef.current) {
        setLoadingBase(false);
        setLoadingRedes(false);
      }
    }
  };

  const fetchResumenPorMes = async (requestId: number) => {
    setLoadingResumenPorMes(true);
    setErrorResumenPorMes(null);

    try {
      const response = await apiClient.get<DominicalMonthlyAttendance[]>(
        `/asistencias-dominicales/${resolvedParams.id}/registros/resumen-por-mes`,
      );

      if (requestId !== resumenPorMesRequestIdRef.current) return;

      setResumenPorMes(response.data);
    } catch (error) {
      if (requestId !== resumenPorMesRequestIdRef.current) return;

      console.error(error);
      setResumenPorMes([]);
      setErrorResumenPorMes('No se pudo cargar la asistencia mensual.');
    } finally {
      if (requestId === resumenPorMesRequestIdRef.current) {
        setLoadingResumenPorMes(false);
      }
    }
  };

  const fetchRegistros = async (requestId: number) => {
    if (!hasFechaSeleccionada) {
      if (requestId === registrosRequestIdRef.current) {
        clearRegistroView();
        setLoadingRegistros(false);
      }
      return;
    }

    setLoadingRegistros(true);
    try {
      const params = {
        search: submittedSearch,
        soloNuevos,
        fecha,
        page,
        limit: pageSize,
        ...(idRed ? { idRed } : {}),
      };
      const registrosRes = await apiClient.get<PagedResponse<RegistroAsistencia>>(
        `/asistencias-dominicales/${resolvedParams.id}/registros`,
        {
          params,
        },
      );

      if (requestId !== registrosRequestIdRef.current) return;

      setRegistros(registrosRes.data.data);
      setTotalRegistros(registrosRes.data.total);
      setTotalPages(registrosRes.data.totalPages || 1);
    } catch (error) {
      if (requestId !== registrosRequestIdRef.current) return;

      console.error(error);
      clearRegistroView();
      alert('Error cargando el detalle de asistencia');
    } finally {
      if (requestId === registrosRequestIdRef.current) {
        setLoadingRegistros(false);
      }
    }
  };

  useEffect(() => {
    const requestId = ++baseRequestIdRef.current;
    const timeoutId = window.setTimeout(() => {
      void fetchBaseData(requestId);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      baseRequestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  useEffect(() => {
    const requestId = ++resumenPorMesRequestIdRef.current;
    const timeoutId = window.setTimeout(() => {
      void fetchResumenPorMes(requestId);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      resumenPorMesRequestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  useEffect(() => {
    const requestId = ++registrosRequestIdRef.current;
    const timeoutId = window.setTimeout(() => {
      void fetchRegistros(requestId);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      registrosRequestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolvedParams.id,
    page,
    pageSize,
    soloNuevos,
    idRed,
    fecha,
    submittedSearch,
    hasFechaSeleccionada,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const shouldReload = search !== submittedSearch || page !== 1;
    setPage(1);
    setSubmittedSearch(search);

    if (shouldReload) {
      clearRegistroView();
    }
  };

  const handleTableFilterChange = () => {
    setPage(1);
    clearRegistroView();
  };

  const handleExport = async () => {
    if (!asistencia) {
      return;
    }

    setExporting(true);
    setExportError(null);
    try {
      await handleDominicalExport(
        apiClient,
        resolvedParams.id,
        asistencia.nombre,
      );
    } catch (error) {
      console.error(error);
      setExportError('Error al exportar el reporte. Intentá de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  if (loadingBase && !asistencia) {
    return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando detalle...</div>;
  }

  if (!asistencia) {
    return <div className="p-4 text-center text-red-500 sm:p-6 lg:p-8">Asistencia no encontrada.</div>;
  }

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/admin/asistencias/dominical"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">
            {asistencia.nombre}
          </h1>
          <p className="break-words text-slate-500 text-sm">
            Sede: {asistencia.sede?.nombre || '—'} · Día: {asistencia.diaRegistro} · Estado:{' '}
            {asistencia.estado}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-1">
          <h2 className="font-semibold text-slate-900 mb-3">QR único</h2>

          {publicUrl && (
            <div className="flex flex-col items-center">
              <div className="mb-4 rounded-xl bg-slate-50 p-3 sm:p-4">
                <QRCode
                  value={publicUrl}
                  size={220}
                  qrStyle="dots"
                  eyeRadius={8}
                  fgColor="#0f172a"
                  id="qr-dominical"
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
              <div className="mt-4">
                <QrPdfDownload
                  publicPath={`/asistencia/dominical/${asistencia.qrToken}`}
                  fileName={`qr-dominical-${asistencia.nombre}`}
                  title={asistencia.nombre}
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">Estadísticas de asistencia</h2>
            <p className="mt-1 text-sm text-slate-500">
              Histórico mensual de asistentes totales y nuevos.
            </p>
          </div>

          <DominicalMonthlyAttendanceCharts
            data={resumenPorMes}
            loading={loadingResumenPorMes}
            error={errorResumenPorMes}
          />

        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Personas registradas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Aplicá los filtros de forma independiente o combinada.
              </p>
            </div>
            <span className="text-sm text-slate-500">
              {hasFechaSeleccionada
                ? `${registros.length} de ${totalRegistros} registros`
                : 'Seleccioná una fecha'}
            </span>
          </div>

          <form
            onSubmit={handleSearch}
            className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6"
          >
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
                clearRegistroView();
              }}
              aria-label="Filtrar por fecha"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
            >
              <option value="">Selecciona una fecha</option>
              {fechasDisponibles.map((fechaDisponible) => (
                <option key={fechaDisponible} value={fechaDisponible}>
                  {fechaDisponible}
                </option>
              ))}
            </select>
            <select
              value={idRed}
              onChange={(e) => {
                setIdRed(e.target.value);
                handleTableFilterChange();
              }}
              disabled={!hasFechaSeleccionada || loadingRedes}
              aria-label="Filtrar por red"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
            >
              <option value="">Todas las redes</option>
              {loadingRedes && <option disabled>Cargando redes...</option>}
              {!loadingRedes && redesError && (
                <option disabled>No se pudieron cargar las redes</option>
              )}
              {redes.map((red) => (
                <option key={red.id} value={red.id}>
                  {red.nombre?.trim() || red.id}
                </option>
              ))}
            </select>
            <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={soloNuevos}
                disabled={!hasFechaSeleccionada}
                onChange={(e) => {
                  setSoloNuevos(e.target.checked);
                  handleTableFilterChange();
                }}
              />
              Solo nuevos
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value as PageSize);
                handleTableFilterChange();
              }}
              aria-label="Cantidad de registros por página"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
            >
              <option value="100">100</option>
              <option value="300">300</option>
              <option value="all">Todas</option>
            </select>
            <button
              type="submit"
              disabled={!hasFechaSeleccionada}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={!asistencia || exporting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exportando...' : 'Exportar histórico'}
            </button>
          </form>

          {exportError && (
            <p className="mb-4 text-sm text-red-600">{exportError}</p>
          )}

          <TableScrollHint />
          <div className="min-w-0 max-w-full overflow-x-auto pb-2">
            <div className="min-w-full rounded-md border border-slate-200">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
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
                      <tr key={registro.id} className="transition-colors hover:bg-slate-50">
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
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
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
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
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
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Siguiente
            </button>
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
