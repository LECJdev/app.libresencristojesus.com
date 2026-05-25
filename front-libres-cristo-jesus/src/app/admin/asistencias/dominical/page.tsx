'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import QrPdfDownload from '@/components/QrPdfDownload';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  Trash2,
  Save,
  X,
} from 'lucide-react';

type EstadoAsistenciaDominical = 'ACTIVO' | 'INACTIVO';
type DiaPredica =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

interface Sede {
  id: string;
  nombre: string | null;
}

interface AsistenciaDominical {
  id: string;
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaDominical;
  qrToken: string;
  sede: Sede | null;
}

interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DIAS: DiaPredica[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
];

const ESTADOS: EstadoAsistenciaDominical[] = ['ACTIVO', 'INACTIVO'];

export default function AsistenciasDominicalesPage() {
  const router = useRouter();

  const [items, setItems] = useState<AsistenciaDominical[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AsistenciaDominical | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    idSede: '',
    diaRegistro: 'DOMINGO' as DiaPredica,
    estado: 'ACTIVO' as EstadoAsistenciaDominical,
  });

  const fetchData = async (
    nextPage: number = page,
    nextSearch: string = search,
  ) => {
    setLoading(true);
    try {
      const [{ data: asistencias }, { data: sedesData }] = await Promise.all([
        apiClient.get<PagedResponse<AsistenciaDominical>>('/asistencias-dominicales', {
          params: { search: nextSearch, page: nextPage, limit },
        }),
        apiClient.get<Sede[]>('/sedes'),
      ]);

      setItems(asistencias.data);
      setTotalPages(asistencias.totalPages || 1);
      setSedes(sedesData);
    } catch (error) {
      console.error(error);
      alert('Error cargando asistencias dominicales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasSedes = useMemo(() => sedes.length > 0, [sedes.length]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchData(1, search);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      nombre: '',
      idSede: sedes[0]?.id || '',
      diaRegistro: 'DOMINGO',
      estado: 'ACTIVO',
    });
    setShowForm(true);
  };

  const openEdit = (item: AsistenciaDominical) => {
    if (!confirm('¿Querés editar esta asistencia dominical?')) return;
    setEditing(item);
    setForm({
      nombre: item.nombre,
      idSede: item.sede?.id || '',
      diaRegistro: item.diaRegistro,
      estado: item.estado,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    if (!form.idSede) {
      alert('Debes seleccionar una sede');
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.put(`/asistencias-dominicales/${editing.id}`, form);
      } else {
        await apiClient.post('/asistencias-dominicales', form);
      }

      closeForm();
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Error guardando la asistencia dominical');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstado = async (item: AsistenciaDominical) => {
    const nextEstado: EstadoAsistenciaDominical =
      item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    if (!confirm(`¿Confirmás cambiar el estado a ${nextEstado}?`)) return;

    try {
      await apiClient.patch(`/asistencias-dominicales/${item.id}/estado`, {
        estado: nextEstado,
      });
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Error cambiando estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro de eliminar esta asistencia dominical?')) return;

    try {
      await apiClient.delete(`/asistencias-dominicales/${id}`);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Error eliminando asistencia');
    }
  };

  const goToDetail = (id: string) => {
    if (!confirm('¿Ir al detalle de esta asistencia?')) return;
    router.push(`/admin/asistencias/dominical/${id}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dominical</h1>
          <p className="text-slate-500 text-sm">
            Gestiona asistencias recurrentes dominicales con QR único por asistencia.
          </p>
        </div>

        <button
          onClick={openCreate}
          disabled={!hasSedes}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Nueva Asistencia
        </button>
      </div>

      {!hasSedes && (
        <div className="mb-5 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Para crear asistencias dominicales primero necesitas al menos una sede registrada.
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o sede"
            className="w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 bg-white"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow">
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Sede</th>
              <th className="px-6 py-4 font-semibold">Día</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">QR</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                  Cargando asistencias...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                  No hay asistencias dominicales registradas.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.nombre}</td>
                  <td className="px-6 py-4 text-slate-700">{item.sede?.nombre || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{item.diaRegistro}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        item.estado === 'ACTIVO'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    <QrPdfDownload
                      publicPath={`/asistencia/dominical/${item.qrToken}`}
                      fileName={`qr-dominical-${item.nombre}`}
                      title={item.nombre}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => goToDetail(item.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleEstado(item)}
                        className="p-2 text-slate-400 hover:text-purple-600 transition-colors"
                        title="Activar / Desactivar"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-end">
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl bg-white rounded-lg border border-slate-200 shadow-lg"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? 'Editar Asistencia Dominical' : 'Nueva Asistencia Dominical'}
              </h2>
              <button type="button" onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sede *</label>
                <select
                  required
                  value={form.idSede}
                  onChange={(e) => setForm((prev) => ({ ...prev, idSede: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                >
                  <option value="">Selecciona una sede</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre || sede.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Día de registro *</label>
                  <select
                    required
                    value={form.diaRegistro}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        diaRegistro: e.target.value as DiaPredica,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                  >
                    {DIAS.map((dia) => (
                      <option key={dia} value={dia}>
                        {dia}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                  <select
                    required
                    value={form.estado}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        estado: e.target.value as EstadoAsistenciaDominical,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-sm disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
