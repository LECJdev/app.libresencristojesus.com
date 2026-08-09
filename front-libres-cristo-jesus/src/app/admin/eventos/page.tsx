'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, QrCode, ClipboardList, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import TableScrollHint from '@/components/TableScrollHint';

interface Evento {
  id: string;
  nombre: string;
  estado: string;
  generaQr: boolean;
}

export default function EventosPage() {
  const { canDeleteData } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEventos = async () => {
    try {
      const { data } = await apiClient.get('/eventos');
      setEventos(data);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEventos(); }, []);

  const handleDelete = async (id: string) => {
    if (!canDeleteData) return;
    if (!confirm('¿Seguro de eliminar este evento?')) return;
    try {
      await apiClient.delete(`/eventos/${id}`);
      fetchEventos();
    } catch (error) {
      console.error('Error eliminando evento', error);
      alert('Error eliminando evento');
    }
  };

  if (loading) return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando eventos...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Libres en Cristo Jesús</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registros de Eventos</h1>
          <p className="text-slate-500">Gestiona los eventos, sus formularios QR y visualiza los asistentes.</p>
        </div>
        <Link href="/admin/eventos/nuevo"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:w-auto">
          <Plus className="h-4 w-4" /> Crear Evento
        </Link>
      </div>

      <TableScrollHint />
      <div className="min-w-0 max-w-full overflow-x-auto pb-2">
        <div className="min-w-full rounded-lg border border-slate-200 bg-white shadow">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre del Evento</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">Genera QR</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {eventos.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay eventos registrados.</td></tr>
            ) : eventos.map((evento) => (
              <tr key={evento.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{evento.nombre}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                    evento.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{evento.estado}</span>
                </td>
                <td className="px-6 py-4">
                  {evento.generaQr ? (
                    <span className="text-blue-600 font-medium flex items-center gap-1"><QrCode className="h-4 w-4" /> Sí</span>
                  ) : (
                    <span className="text-slate-500">No</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2 sm:flex-nowrap">
                    <Link href={`/admin/eventos/${evento.id}/asistencias`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-green-600 md:min-h-9 md:min-w-9" title="Ver Asistencias">
                      <ClipboardList className="h-5 w-5" />
                    </Link>
                    <Link href={`/admin/eventos/${evento.id}/qr`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-blue-600 md:min-h-9 md:min-w-9" title="Ver QR">
                      <QrCode className="h-5 w-5" />
                    </Link>
                    <Link href={`/admin/eventos/editar/${evento.id}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-orange-500 md:min-h-9 md:min-w-9" title="Editar Evento">
                      <Pencil className="h-5 w-5" />
                    </Link>
                    {canDeleteData && (
                      <button onClick={() => handleDelete(evento.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-red-600 md:min-h-9 md:min-w-9" title="Eliminar">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
