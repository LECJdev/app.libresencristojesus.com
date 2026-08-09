'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiClient } from '@/lib/api';
import { Plus, Trash2, Edit2, Save, X, Users, Search, ShieldPlus, House, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRoles, ROLE_COLORS, ROLE_LABELS, type UserRole } from '@/lib/roles';
import { handlePersonasExport } from '@/lib/personas-export';
import TableScrollHint from '@/components/TableScrollHint';

interface Persona {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  celular: string | null;
  documento: string | null;
  tipoDocumento: string | null;
  genero: string | null;
  edad: number | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  correo: string | null;
  barrio: string | null;
  rol: UserRole;
  roles?: UserRole[];
  red: { id: string; nombre: string } | null;
  invitadoPor: { id: string; nombres: string; apellidos: string } | null;
}

interface SelectOption { id: string; nombre?: string; nombres?: string; apellidos?: string; }

const SESSION_ERROR_MESSAGE =
  'Tu sesión expiró o no es válida. Inicia sesión nuevamente para continuar.';

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export default function PersonasPage() {
  const { canAssignCasaDePazLeader, canDeleteData, isSuperAdmin, logout } = useAuth();
  const [items, setItems] = useState<Persona[]>([]);
  const [redes, setRedes] = useState<SelectOption[]>([]);
  const [personas, setPersonas] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [redFilter, setRedFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombres: '', apellidos: '', celular: '', documento: '', tipoDocumento: 'C.C', genero: '',
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
    setForm({ nombres: '', apellidos: '', celular: '', documento: '', tipoDocumento: 'C.C', genero: '', edad: '', fechaNacimiento: '', direccion: '', correo: '', barrio: '', redId: '', invitadoPorId: '' });
    setEditingId(null); setShowForm(false);
  };

  const handleEdit = (item: Persona) => {
    setForm({
      nombres: item.nombres || '', apellidos: item.apellidos || '', celular: item.celular || '',
      documento: item.documento || '',
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
      nombres: form.nombres, apellidos: form.apellidos, celular: form.celular, documento: form.documento || null,
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
    if (!canDeleteData) return;
    if (!confirm('¿Eliminar esta persona?')) return;
    try { await apiClient.delete(`/personas/${id}`); fetchAll(); }
    catch { alert('Error al eliminar'); }
  };

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);

    try {
      await handlePersonasExport(apiClient);
    } catch (error) {
      console.error(error);

      if (isUnauthorizedError(error)) {
        setExportError(SESSION_ERROR_MESSAGE);
        logout();
        return;
      }

      setExportError('No se pudo descargar el Excel de personas. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  const handlePromote = async (personaId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('¿Promover esta persona a Personal Administrativo? Su acceso inicial será con correo + documento.')) return;

    try {
      await apiClient.post('/personas/admin/promover-personal-administrativo', {
        personaId,
      });
      fetchAll();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Error al promover la persona');
    }
  };

  const handleAssignCasaDePazLeader = async (personaId: string) => {
    if (!canAssignCasaDePazLeader) return;
    if (!confirm('Assign Casa de Paz leader access to this person? Initial access will use email + document when needed.')) return;

    try {
      await apiClient.post('/personas/admin/asignar-lider-casa-de-paz', {
        personaId,
      });
      fetchAll();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Error assigning Casa de Paz leader access');
    }
  };

  const hasCasaDePazLeaderRole = (persona: Persona) =>
    normalizeRoles({ rol: persona.rol, roles: persona.roles }).includes('LIDER_CASA_DE_PAZ');

  const filtered = items.filter(p => {
    const matchesSearch = !searchTerm || (() => {
      const q = searchTerm.toLowerCase();
      return (p.nombres?.toLowerCase().includes(q)) || (p.apellidos?.toLowerCase().includes(q)) || (p.celular?.includes(q)) || (p.documento?.includes(q));
    })();
    const matchesRed = !redFilter
      || (redFilter === '__none__' ? !p.red : p.red?.id === redFilter);

    return matchesSearch && matchesRed;
  });

  if (loading) return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personas</h1>
            <p className="text-slate-500 text-sm">Registra y gestiona los integrantes de la iglesia.</p>
          </div>
        </div>
         {!showForm && (
           <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
             <button
               type="button"
               onClick={() => void handleExport()}
               disabled={exporting}
               className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
             >
               <Download className="h-4 w-4" />
               {exporting ? 'Exportando...' : 'Descargar Excel'}
             </button>
             <button
               type="button"
               onClick={() => { resetForm(); setShowForm(true); }}
               className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:w-auto"
             >
               <Plus className="h-4 w-4" /> Nueva Persona
             </button>
           </div>
         )}
       </div>

       {exportError ? (
         <p role="alert" className="-mt-2 mb-4 text-sm text-red-600">
           {exportError}
         </p>
       ) : null}

       {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
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
              <label className="text-sm font-medium text-slate-700">Documento</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={form.tipoDocumento} onChange={e => setForm({ ...form, tipoDocumento: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white sm:w-36">
                  <option value="C.C">C.C</option><option value="T.I.">T.I.</option><option value="C.E.">C.E.</option><option value="PT">PT</option>
                </select>
                <input type="text" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })}
                  placeholder="Número" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
              </div>
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
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetForm} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 sm:w-auto"><X className="h-4 w-4" />Cancelar</button>
            <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white hover:bg-slate-800 sm:w-auto"><Save className="h-4 w-4" />Guardar</button>
          </div>
        </form>
      )}

      {/* Buscador */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre o celular..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white placeholder:text-slate-400" />
        </div>
        <select
          value={redFilter}
          onChange={e => setRedFilter(e.target.value)}
          aria-label="Filtrar personas por red"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="">Todas las redes</option>
          <option value="__none__">Sin red asignada</option>
          {redes.map((red) => (
            <option key={red.id} value={red.id}>
              {red.nombre || red.id}
            </option>
          ))}
        </select>
      </div>

      <TableScrollHint />
      <div className="min-w-0 max-w-full overflow-x-auto pb-2">
        <div className="min-w-full rounded-lg border border-slate-200 bg-white shadow">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre Completo</th>
              <th className="px-6 py-4 font-semibold">Documento</th>
              <th className="px-6 py-4 font-semibold">Celular</th>
              <th className="px-6 py-4 font-semibold">Red</th>
              <th className="px-6 py-4 font-semibold">Roles</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No hay personas registradas.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{item.nombres} {item.apellidos}</td>
                <td className="px-6 py-4 text-slate-600">{item.documento || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{item.celular || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{item.red?.nombre || '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {normalizeRoles({ rol: item.rol, roles: item.roles }).map((role) => (
                      <span
                        key={`${item.id}-${role}`}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2 sm:flex-nowrap">
                    {canAssignCasaDePazLeader && !hasCasaDePazLeaderRole(item) && item.documento && item.correo && (
                      <button
                        onClick={() => handleAssignCasaDePazLeader(item.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-rose-600 md:min-h-9 md:min-w-9"
                        title="Assign Casa de Paz leader access"
                      >
                        <House className="h-4 w-4" />
                      </button>
                    )}
                    {isSuperAdmin && item.rol === 'INTEGRANTE' && item.documento && item.correo && (
                      <button
                        onClick={() => handlePromote(item.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-amber-600 md:min-h-9 md:min-w-9"
                        title="Promover a Personal Administrativo (correo + documento)"
                      >
                        <ShieldPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleEdit(item)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-blue-600 md:min-h-9 md:min-w-9" title="Editar"><Edit2 className="h-4 w-4" /></button>
                    {canDeleteData && (
                      <button onClick={() => handleDelete(item.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-red-600 md:min-h-9 md:min-w-9" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
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
