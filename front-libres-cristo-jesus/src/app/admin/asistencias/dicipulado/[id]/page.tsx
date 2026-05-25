'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { normalizeAttendanceDateOptions } from '@/lib/attendance-date';
import { ArrowLeft, ExternalLink, QrCode, Search } from 'lucide-react';
import { QRCode } from 'react-qrcode-logo';

type EstadoAsistenciaDicipulado = 'ACTIVO' | 'INACTIVO';
type DiaPredica =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

interface AsistenciaDicipulado {
  id: string;
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaDicipulado;
  qrToken: string;
  sede: { id: string; nombre: string | null } | null;
  red: { id: string; nombre: string | null } | null;
  direccionPersonalizada: string | null;
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

export default function DetalleAsistenciaDicipuladoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  const [asistencia, setAsistencia] = useState<AsistenciaDicipulado | null>(null);
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [fecha, setFecha] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const publicUrl = useMemo(() => {
    if (!asistencia) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/asistencia/dicipulado/${asistencia.qrToken}`;
  }, [asistencia]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [asistenciaRes, fechasRes] = await Promise.all([
        apiClient.get<AsistenciaDicipulado>(
          `/asistencias-dicipulados/${resolvedParams.id}`,
        ),
        apiClient.get<FechasDisponiblesResponse>(
          `/asistencias-dicipulados/${resolvedParams.id}/registros/fechas`,
        ),
      ]);

      setAsistencia(asistenciaRes.data);
      setFechasDisponibles(normalizeAttendanceDateOptions(fechasRes.data));
    } catch (error) {
      console.error(error);
      alert('Error cargando el detalle de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const registrosRes = await apiClient.get<PagedResponse<RegistroAsistencia>>(
        `/asistencias-dicipulados/${resolvedParams.id}/registros`,
        {
          params: {
            search: submittedSearch,
            soloNuevos,
            fecha,
            page,
            limit: 10,
          },
        },
      );

      setRegistros(registrosRes.data.data);
      setTotalPages(registrosRes.data.totalPages || 1);
    } catch (error) {
      console.error(error);
      alert('Error cargando el detalle de asistencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchBaseData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchRegistros();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id, page, soloNuevos, fecha, submittedSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(search);
  };

  const ubicacion = asistencia?.sede?.nombre || asistencia?.direccionPersonalizada || '—';

  if (loading && !asistencia) {
    return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando detalle...</div>;
  }

  if (!asistencia) {
    return <div className="p-4 text-center text-red-500 sm:p-6 lg:p-8">Asistencia no encontrada.</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/admin/asistencias/dicipulado"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {asistencia.nombre}
          </h1>
          <p className="text-slate-500 text-sm">
            Ubicación: {ubicacion} · Red: {asistencia.red?.nombre || '—'} · Día:{' '}
            {asistencia.diaRegistro} · Estado: {asistencia.estado}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                  id="qr-dicipulado"
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

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">Personas registradas</h2>
            <span className="text-sm text-slate-500">{registros.length} en esta página</span>
          </div>

          <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, documento o celular"
                className="min-h-11 w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
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
              <option value="">Todas las fechas</option>
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
                onChange={(e) => {
                  setSoloNuevos(e.target.checked);
                  setPage(1);
                }}
              />
              Solo nuevos
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 md:w-auto"
            >
              Filtrar
            </button>
          </form>

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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Cargando registros...
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
                      <td className="px-4 py-3 text-slate-700">{registro.persona?.documento || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{registro.persona?.celular || '—'}</td>
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
              disabled={page === 1}
              className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-slate-600">
              Página {page} de {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50"
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
