'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Edit2, Save, X, MapPin } from 'lucide-react';

interface Distrito {
  id: string;
  red: { id: string; nombre: string } | null;
  sede: { id: string; nombre: string } | null;
}

interface SelectOption { id: string; nombre: string; }

export default function DistritosPage() {
  const [items, setItems] = useState<Distrito[]>([]);
  const [redes, setRedes] = useState<SelectOption[]>([]);
  const [sedes, setSedes] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ redId: '', sedeId: '' });

  const fetchAll = async () => {
    try {
      const [dRes, rRes, sRes] = await Promise.all([
        apiClient.get('/distritos'),
        apiClient.get('/redes'),
        apiClient.get('/sedes'),
      ]);
      setItems(dRes.data);
      setRedes(rRes.data);
      setSedes(sRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => { setForm({ redId: '', sedeId: '' }); setEditingId(null); setShowForm(false); };

  const handleEdit = (item: Distrito) => {
    setForm({ redId: item.red?.id || '', sedeId: item.sede?.id || '' });
    setEditingId(item.id); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    if (form.redId) payload.red = { id: form.redId };
    if (form.sedeId) payload.sede = { id: form.sedeId };
    try {
      if (editingId) await apiClient.put(`/distritos/${editingId}`, payload);
      else await apiClient.post('/distritos', payload);
      resetForm(); fetchAll();
    } catch { alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este distrito?')) return;
    try { await apiClient.delete(`/distritos/${id}`); fetchAll(); }
    catch { alert('Error al eliminar'); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg"><MapPin className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Distritos</h1>
            <p className="text-slate-500 text-sm">Gestiona los distritos y su asociación con Redes y Sedes.</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm">
            <Plus className="h-4 w-4" /> Nuevo Distrito
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border border-slate-200 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">{editingId ? 'Editar Distrito' : 'Crear Nuevo Distrito'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Red</label>
              <select value={form.redId} onChange={e => setForm({ ...form, redId: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
                <option value="">— Sin asignar —</option>
                {redes.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Sede</label>
              <select value={form.sedeId} onChange={e => setForm({ ...form, sedeId: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
                <option value="">— Sin asignar —</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
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
              <th className="px-6 py-4 font-semibold">ID</th>
              <th className="px-6 py-4 font-semibold">Red</th>
              <th className="px-6 py-4 font-semibold">Sede</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay distritos registrados.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.id.slice(0, 18)}...</td>
                <td className="px-6 py-4 text-slate-900">{item.red?.nombre || '—'}</td>
                <td className="px-6 py-4 text-slate-900">{item.sede?.nombre || '—'}</td>
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
