'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { ArrowLeft, ExternalLink, QrCode, Search } from 'lucide-react';
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

export default function DetalleAsistenciaDominicalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  const [asistencia, setAsistencia] = useState<AsistenciaDominical | null>(null);
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const publicUrl = useMemo(() => {
    if (!asistencia) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/asistencia/dominical/${asistencia.qrToken}`;
  }, [asistencia]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [asistenciaRes, registrosRes] = await Promise.all([
        apiClient.get<AsistenciaDominical>(
          `/asistencias-dominicales/${resolvedParams.id}`,
        ),
        apiClient.get<PagedResponse<RegistroAsistencia>>(
          `/asistencias-dominicales/${resolvedParams.id}/registros`,
          {
            params: {
              search,
              soloNuevos,
              page,
              limit: 10,
            },
          },
        ),
      ]);

      setAsistencia(asistenciaRes.data);
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
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, soloNuevos]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchData();
  };

  if (loading && !asistencia) {
    return <div className="p-8 text-center text-slate-500">Cargando detalle...</div>;
  }

  if (!asistencia) {
    return <div className="p-8 text-center text-red-500">Asistencia no encontrada.</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/asistencias/dominical"
          className="p-2 rounded-md border border-slate-300 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {asistencia.nombre}
          </h1>
          <p className="text-slate-500 text-sm">
            Sede: {asistencia.sede?.nombre || '—'} · Día: {asistencia.diaRegistro} · Estado:{' '}
            {asistencia.estado}
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
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Personas registradas</h2>
            <span className="text-sm text-slate-500">{registros.length} en esta página</span>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, documento o celular"
                className="w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700">
              <input
                type="checkbox"
                checked={soloNuevos}
                onChange={(e) => setSoloNuevos(e.target.checked)}
              />
              Solo nuevos
            </label>
            <button
              type="submit"
              className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
            >
              Filtrar
            </button>
          </form>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-sm text-left">
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

          <div className="mt-4 flex justify-end items-center gap-2 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-300 rounded-md disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-slate-600">
              Página {page} de {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-300 rounded-md disabled:opacity-50"
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
