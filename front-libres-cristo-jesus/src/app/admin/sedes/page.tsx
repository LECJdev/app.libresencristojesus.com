'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Edit2, Save, X, Building2 } from 'lucide-react';

interface Sede {
  id: string;
  nombre: string;
  direccion: string;
}

export default function SedesPage() {
  const [items, setItems] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', direccion: '' });

  const fetchItems = async () => {
    try { const { data } = await apiClient.get('/sedes'); setItems(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => { setForm({ nombre: '', direccion: '' }); setEditingId(null); setShowForm(false); };

  const handleEdit = (item: Sede) => {
    setForm({ nombre: item.nombre || '', direccion: item.direccion || '' });
    setEditingId(item.id); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) await apiClient.put(`/sedes/${editingId}`, form);
      else await apiClient.post('/sedes', form);
      resetForm(); fetchItems();
    } catch { alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sede?')) return;
    try { await apiClient.delete(`/sedes/${id}`); fetchItems(); }
    catch { alert('Error al eliminar'); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Building2 className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sedes</h1>
            <p className="text-slate-500 text-sm">Gestiona las sedes de la iglesia.</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm">
            <Plus className="h-4 w-4" /> Nueva Sede
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border border-slate-200 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">{editingId ? 'Editar Sede' : 'Crear Nueva Sede'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nombre *</label>
              <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" placeholder="Ej. Sede Principal" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Dirección</label>
              <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" placeholder="Dirección de la sede" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"><X className="h-4 w-4 inline mr-1" />Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800"><Save className="h-4 w-4 inline mr-1" />Guardar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Dirección</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay sedes registradas.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{item.nombre}</td>
                <td className="px-6 py-4 text-slate-600">{item.direccion || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Editar"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
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
