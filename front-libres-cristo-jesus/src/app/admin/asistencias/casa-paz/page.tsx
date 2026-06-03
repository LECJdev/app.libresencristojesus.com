'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import QrPdfDownload from '@/components/QrPdfDownload';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  Trash2,
  Save,
  X,
  Home,
} from 'lucide-react';

type EstadoAsistenciaCasaPaz = 'ACTIVO' | 'INACTIVO';
type DiaPredica =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

interface Red {
  id: string;
  nombre: string | null;
}

interface AsistenciaCasaPaz {
  id: string;
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaCasaPaz;
  qrToken: string;
  idRed: string;
  direccionCasa: string;
  red: Red;
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

const ESTADOS: EstadoAsistenciaCasaPaz[] = ['ACTIVO', 'INACTIVO'];

export default function AsistenciasCasaPazPage() {
  const router = useRouter();
  const { canDeleteData } = useAuth();

  const [items, setItems] = useState<AsistenciaCasaPaz[]>([]);
  const [redes, setRedes] = useState<Red[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AsistenciaCasaPaz | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    diaRegistro: 'DOMINGO' as DiaPredica,
    estado: 'ACTIVO' as EstadoAsistenciaCasaPaz,
    idRed: '',
    direccionCasa: '',
  });

  const fetchData = async (
    nextPage: number = page,
    nextSearch: string = search,
  ) => {
    setLoading(true);
    try {
      const [{ data: asistencias }, { data: redesData }] = await Promise.all([
        apiClient.get<PagedResponse<AsistenciaCasaPaz>>('/asistencias-casa-paz', {
          params: { search: nextSearch, page: nextPage, limit },
        }),
        apiClient.get<Red[]>('/redes'),
      ]);

      setItems(asistencias.data);
      setTotalPages(asistencias.totalPages || 1);
      setRedes(redesData);
    } catch (error) {
      console.error(error);
      alert('Error cargando asistencias de casa de paz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchData(1, search);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      nombre: '',
      diaRegistro: 'DOMINGO',
      estado: 'ACTIVO',
      idRed: redes[0]?.id || '',
      direccionCasa: '',
    });
    setShowForm(true);
  };

  const openEdit = (item: AsistenciaCasaPaz) => {
    if (!confirm('¿Querés editar esta asistencia de casa de paz?')) return;

    setEditing(item);
    setForm({
      nombre: item.nombre,
      diaRegistro: item.diaRegistro,
      estado: item.estado,
      idRed: item.idRed,
      direccionCasa: item.direccionCasa,
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

    if (!form.idRed) {
      alert('Debes seleccionar una red');
      return;
    }

    if (!form.direccionCasa.trim()) {
      alert('Debes ingresar la dirección de la casa');
      return;
    }

    const payload = {
      nombre: form.nombre,
      diaRegistro: form.diaRegistro,
      estado: form.estado,
      idRed: form.idRed,
      direccionCasa: form.direccionCasa,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.put(`/asistencias-casa-paz/${editing.id}`, payload);
      } else {
        await apiClient.post('/asistencias-casa-paz', payload);
      }

      closeForm();
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Error guardando la asistencia de casa de paz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstado = async (item: AsistenciaCasaPaz) => {
    const nextEstado: EstadoAsistenciaCasaPaz =
      item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    if (!confirm(`¿Confirmás cambiar el estado a ${nextEstado}?`)) return;

    try {
      await apiClient.patch(`/asistencias-casa-paz/${item.id}/estado`, {
        estado: nextEstado,
      });
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Error cambiando estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteData) return;
    if (!confirm('¿Seguro de eliminar esta asistencia de casa de paz?')) return;

    try {
      await apiClient.delete(`/asistencias-casa-paz/${id}`);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Error eliminando asistencia');
    }
  };

  const goToDetail = (id: string) => {
    if (!confirm('¿Ir al detalle de esta asistencia?')) return;
    router.push(`/admin/asistencias/casa-paz/${id}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Casa de Paz
          </h1>
          <p className="text-slate-500 text-sm">
            Gestiona asistencias recurrentes por red y dirección de casa.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nueva Asistencia
        </button>
      </div>

      <form onSubmit={handleSearch} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, red o dirección"
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
              <th className="px-6 py-4 font-semibold">Red</th>
              <th className="px-6 py-4 font-semibold">Dirección</th>
              <th className="px-6 py-4 font-semibold">Día</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">QR</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                  Cargando asistencias...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                  No hay asistencias de casa de paz registradas.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.nombre}</td>
                  <td className="px-6 py-4 text-slate-700">{item.red?.nombre || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{item.direccionCasa}</td>
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
                      publicPath={`/asistencia/casa-paz/${item.qrToken}`}
                      fileName={`qr-casa-paz-${item.nombre}`}
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
                      {canDeleteData && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
                {editing ? 'Editar Asistencia Casa de Paz' : 'Nueva Asistencia Casa de Paz'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600"
              >
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Red *</label>
                <select
                  required
                  value={form.idRed}
                  onChange={(e) => setForm((prev) => ({ ...prev, idRed: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                >
                  <option value="">Selecciona una red</option>
                  {redes.map((red) => (
                    <option key={red.id} value={red.id}>
                      {red.nombre || red.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dirección de la casa *
                </label>
                <input
                  type="text"
                  required
                  value={form.direccionCasa}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, direccionCasa: e.target.value }))
                  }
                  placeholder="Ej: Cra 12 #45-67 Barrio Centro"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                />
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
                        estado: e.target.value as EstadoAsistenciaCasaPaz,
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

      {!loading && items.length === 0 && (
        <div className="mt-6 border border-dashed border-slate-300 rounded-lg p-5 text-sm text-slate-500 flex items-center gap-2">
          <Home className="h-4 w-4" /> Crea tu primera asistencia para Casa de Paz.
        </div>
      )}
    </div>
  );
}
