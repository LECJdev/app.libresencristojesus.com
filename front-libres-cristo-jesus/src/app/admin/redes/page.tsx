'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Edit2, Save, X, Network } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Red {
  id: string;
  nombre: string;
  detalles: string;
  idSede: string | null;
  sede: { id: string; nombre: string | null } | null;
}

interface SedeOption {
  id: string;
  nombre: string | null;
}

export default function RedesPage() {
  const { canDeleteData } = useAuth();
  const [items, setItems] = useState<Red[]>([]);
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', detalles: '', idSede: '' });

  const fetchItems = async () => {
    try {
      const [{ data: redesData }, { data: sedesData }] = await Promise.all([
        apiClient.get('/redes'),
        apiClient.get('/sedes'),
      ]);
      setItems(redesData);
      setSedes(sedesData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => { setForm({ nombre: '', detalles: '', idSede: '' }); setEditingId(null); setShowForm(false); };

  const handleEdit = (item: Red) => {
    setForm({ nombre: item.nombre || '', detalles: item.detalles || '', idSede: item.idSede || '' });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/redes/${editingId}`, form);
      } else {
        await apiClient.post('/redes', form);
      }
      resetForm();
      fetchItems();
    } catch (err) { console.error(err); alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteData) return;
    if (!confirm('¿Eliminar esta red?')) return;
    try { await apiClient.delete(`/redes/${id}`); fetchItems(); }
    catch (err) { console.error(err); alert('Error al eliminar'); }
  };

  if (loading) return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Network className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Libres en Cristo Jesús</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Redes</h1>
            <p className="text-slate-500 text-sm">Gestiona las redes de la iglesia.</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:w-auto">
            <Plus className="h-4 w-4" /> Nueva Red
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
          <h2 className="font-semibold text-slate-800">{editingId ? 'Editar Red' : 'Crear Nueva Red'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nombre *</label>
              <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" placeholder="Ej. Red Central" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Detalles</label>
              <input type="text" value={form.detalles} onChange={e => setForm({ ...form, detalles: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" placeholder="Descripción opcional" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Sede *</label>
              <select required value={form.idSede} onChange={e => setForm({ ...form, idSede: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
                <option value="">Selecciona una sede</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>{sede.nombre || sede.id}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetForm} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 sm:w-auto"><X className="h-4 w-4" />Cancelar</button>
            <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white hover:bg-slate-800 sm:w-auto"><Save className="h-4 w-4" />Guardar</button>
          </div>
        </form>
      )}

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="min-w-full rounded-lg border border-slate-200 bg-white shadow">
        <table className="min-w-[620px] w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Detalles</th>
              <th className="px-6 py-4 font-semibold">Sede</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay redes registradas.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{item.nombre}</td>
                <td className="px-6 py-4 text-slate-600">{item.detalles || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{item.sede?.nombre || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2 sm:flex-nowrap">
                    <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Editar"><Edit2 className="h-4 w-4" /></button>
                    {canDeleteData && (
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
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
