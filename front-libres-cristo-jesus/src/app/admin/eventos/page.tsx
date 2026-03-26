'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, QrCode, ClipboardList, Pencil } from 'lucide-react';
import Link from 'next/link';

interface Evento {
  id: string;
  nombre: string;
  estado: string;
  generaQr: boolean;
}

export default function EventosPage() {
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
    if (!confirm('¿Seguro de eliminar este evento?')) return;
    try {
      await apiClient.delete(`/eventos/${id}`);
      fetchEventos();
    } catch (error) {
      console.error('Error eliminando evento', error);
      alert('Error eliminando evento');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando eventos...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registros de Eventos</h1>
          <p className="text-slate-500">Gestiona los eventos, sus formularios QR y visualiza los asistentes.</p>
        </div>
        <Link href="/admin/eventos/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm">
          <Plus className="h-4 w-4" /> Crear Evento
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
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
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/eventos/${evento.id}/asistencias`}
                      className="p-2 text-slate-400 hover:text-green-600 transition-colors" title="Ver Asistencias">
                      <ClipboardList className="h-5 w-5" />
                    </Link>
                    <Link href={`/admin/eventos/${evento.id}/qr`}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Ver QR">
                      <QrCode className="h-5 w-5" />
                    </Link>
                    <Link href={`/admin/eventos/editar/${evento.id}`}
                      className="p-2 text-slate-400 hover:text-orange-500 transition-colors" title="Editar Evento">
                      <Pencil className="h-5 w-5" />
                    </Link>
                    <button onClick={() => handleDelete(evento.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
