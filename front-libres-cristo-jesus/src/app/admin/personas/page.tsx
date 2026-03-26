'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Edit2, Save, X, Users, Search } from 'lucide-react';

interface Persona {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  celular: string | null;
  tipoDocumento: string | null;
  genero: string | null;
  edad: number | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  correo: string | null;
  barrio: string | null;
  rol: string;
  red: { id: string; nombre: string } | null;
  invitadoPor: { id: string; nombres: string; apellidos: string } | null;
}

interface SelectOption { id: string; nombre?: string; nombres?: string; apellidos?: string; }

export default function PersonasPage() {
  const [items, setItems] = useState<Persona[]>([]);
  const [redes, setRedes] = useState<SelectOption[]>([]);
  const [personas, setPersonas] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    nombres: '', apellidos: '', celular: '', tipoDocumento: 'C.C', genero: '',
    edad: '', fechaNacimiento: '', direccion: '', correo: '', barrio: '', redId: '', invitadoPorId: ''
  });

  const fetchAll = async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        apiClient.get('/personas'),
        apiClient.get('/redes'),
      ]);
      setItems(pRes.data);
      setRedes(rRes.data);
      setPersonas(pRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setForm({ nombres: '', apellidos: '', celular: '', tipoDocumento: 'C.C', genero: '', edad: '', fechaNacimiento: '', direccion: '', correo: '', barrio: '', redId: '', invitadoPorId: '' });
    setEditingId(null); setShowForm(false);
  };

  const handleEdit = (item: Persona) => {
    setForm({
      nombres: item.nombres || '', apellidos: item.apellidos || '', celular: item.celular || '',
      tipoDocumento: item.tipoDocumento || 'C.C', genero: item.genero || '', edad: item.edad?.toString() || '',
      fechaNacimiento: item.fechaNacimiento || '',
      direccion: item.direccion || '', correo: item.correo || '', barrio: item.barrio || '',
      redId: item.red?.id || '', invitadoPorId: item.invitadoPor?.id || ''
    });
    setEditingId(item.id); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      nombres: form.nombres, apellidos: form.apellidos, celular: form.celular,
      tipoDocumento: form.tipoDocumento, genero: form.genero || null, edad: form.edad ? parseInt(form.edad) : null,
      fechaNacimiento: form.fechaNacimiento || null,
      direccion: form.direccion || null, correo: form.correo || null, barrio: form.barrio || null,
    };
    if (form.redId) payload.red = { id: form.redId };
    if (form.invitadoPorId) payload.invitadoPor = { id: form.invitadoPorId };
    try {
      if (editingId) await apiClient.put(`/personas/${editingId}`, payload);
      else await apiClient.post('/personas', payload);
      resetForm(); fetchAll();
    } catch { alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta persona?')) return;
    try { await apiClient.delete(`/personas/${id}`); fetchAll(); }
    catch { alert('Error al eliminar'); }
  };

  const filtered = items.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (p.nombres?.toLowerCase().includes(q)) || (p.apellidos?.toLowerCase().includes(q)) || (p.celular?.includes(q));
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personas</h1>
            <p className="text-slate-500 text-sm">Registra y gestiona los integrantes de la iglesia.</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm">
            <Plus className="h-4 w-4" /> Nueva Persona
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border border-slate-200 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">{editingId ? 'Editar Persona' : 'Registrar Nueva Persona'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nombres *</label>
              <input required type="text" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Apellidos *</label>
              <input required type="text" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Celular *</label>
              <input required type="text" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Tipo Documento</label>
              <select value={form.tipoDocumento} onChange={e => setForm({ ...form, tipoDocumento: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
                <option value="C.C">C.C</option><option value="T.I.">T.I.</option><option value="C.E.">C.E.</option><option value="PT">PT</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Género</label>
              <select value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
                <option value="">— Seleccionar —</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Edad</label>
              <input type="number" value={form.edad} onChange={e => setForm({ ...form, edad: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Fecha de Nacimiento</label>
              <input type="date" value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Correo</label>
              <input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Dirección</label>
              <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Barrio</label>
              <input type="text" value={form.barrio} onChange={e => setForm({ ...form, barrio: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Red</label>
              <select value={form.redId} onChange={e => setForm({ ...form, redId: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
                <option value="">— Sin asignar —</option>
                {redes.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium text-slate-700">Invitado por</label>
              <select value={form.invitadoPorId} onChange={e => setForm({ ...form, invitadoPorId: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
                <option value="">— Ninguno —</option>
                {personas.filter(p => p.id !== editingId).map(p => (
                  <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"><X className="h-4 w-4 inline mr-1" />Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800"><Save className="h-4 w-4 inline mr-1" />Guardar</button>
          </div>
        </form>
      )}

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" placeholder="Buscar por nombre o celular..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white placeholder:text-slate-400" />
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre Completo</th>
              <th className="px-6 py-4 font-semibold">Celular</th>
              <th className="px-6 py-4 font-semibold">Red</th>
              <th className="px-6 py-4 font-semibold">Rol</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay personas registradas.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{item.nombres} {item.apellidos}</td>
                <td className="px-6 py-4 text-slate-600">{item.celular || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{item.red?.nombre || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    item.rol === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                    item.rol === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{item.rol}</span>
                </td>
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
