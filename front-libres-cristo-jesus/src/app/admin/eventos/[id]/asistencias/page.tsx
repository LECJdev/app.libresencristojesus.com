'use client';

import { useEffect, useState, use } from 'react';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Search, UserPlus, CheckCircle2, Eye, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import PersonaSearchInput from '@/components/PersonaSearchInput';

interface Asistencia {
  id: string;
  fechaAsistencia: string;
  persona: { id: string; nombres: string; apellidos: string; celular: string };
  datosPersonalizados: Record<string, any> | null;
}

export default function EventoAsistenciasPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [evento, setEvento] = useState<any>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRegistro, setShowRegistro] = useState(false);
  const [searchDoc, setSearchDoc] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({ nombres: '', apellidos: '', celular: '', documento: '', tipoDocumento: 'C.C', direccion: '', correo: '', edad: '', barrio: '', genero: '', fechaNacimiento: '' });
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const [searchTermGlobal, setSearchTermGlobal] = useState('');
  const [filtrosValor, setFiltrosValor] = useState<Record<string, string>>({});
  
  const [viewingPersona, setViewingPersona] = useState<any>(null);
  const [editingAsistencia, setEditingAsistencia] = useState<Asistencia | null>(null);
  const [editRespuestas, setEditRespuestas] = useState<Record<string, any>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  const fetchData = async () => {
    try {
      const [evRes, asRes] = await Promise.all([
        apiClient.get(`/eventos/${resolvedParams.id}`),
        apiClient.get('/asistencias/evento'),
      ]);
      setEvento(evRes.data);
      const filtered = asRes.data.filter((a: any) => a.evento?.id === resolvedParams.id);
      setAsistencias(filtered);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [resolvedParams.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDoc.trim()) return;
    setIsSearching(true); setSuccessMsg('');
    try {
      // Buscamos primero por celular, si no, intentamos por documento en un futuro (por ahora unificamos búsqueda)
      const { data } = await apiClient.get(`/personas/celular/${searchDoc}`);
      if (data) { setPersonaEncontrada(data); setIsNewUser(false); }
      else { setPersonaEncontrada(null); setIsNewUser(true); setForm(f => ({ ...f, celular: searchDoc, documento: searchDoc })); }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setPersonaEncontrada(null); setIsNewUser(true); setForm(f => ({ ...f, celular: searchDoc, documento: searchDoc }));
      } else { alert('Error buscando persona'); }
    } finally { setIsSearching(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let personaId = personaEncontrada?.id;
      if (isNewUser) {
        const payload = { ...form, edad: form.edad ? parseInt(form.edad) : null, genero: form.genero || null, fechaNacimiento: form.fechaNacimiento || null };
        const { data } = await apiClient.post('/personas', payload);
        personaId = data.id;
      }
      await apiClient.post('/asistencias/evento', {
        evento: { id: evento.id }, persona: { id: personaId }, datosPersonalizados: respuestas
      });
      setSuccessMsg(`Asistencia de ${personaEncontrada?.nombres || form.nombres} registrada.`);
      setPersonaEncontrada(null); setIsNewUser(false); setSearchDoc(''); setRespuestas({});
      setForm({ nombres: '', apellidos: '', celular: '', documento: '', tipoDocumento: 'C.C', direccion: '', correo: '', edad: '', barrio: '', genero: '', fechaNacimiento: '' });
      fetchData();
    } catch { alert('Error registrando asistencia'); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsistencia) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/asistencias/evento/${editingAsistencia.id}`, { datosPersonalizados: editRespuestas });
      setSuccessMsg(`Registro de ${editingAsistencia.persona?.nombres} actualizado.`);
      setEditingAsistencia(null); setEditRespuestas({});
      fetchData();
    } catch { alert('Error actualizando registro'); }
    finally { setSubmitting(false); }
  };

  const renderCampoAdmin = (c: any, values: Record<string, any>, setValues: (val: Record<string, any>) => void) => {
    switch (c.tipo) {
      case 'sino':
        return (
          <select required={c.requerido} value={values[c.id] || ''} onChange={e => setValues({ ...values, [c.id]: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
            <option value="">Selecciona...</option><option value="Si">Sí</option><option value="No">No</option>
          </select>
        );
      case 'opciones':
        return (
          <select required={c.requerido} value={values[c.id] || ''} onChange={e => setValues({ ...values, [c.id]: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
            <option value="">Selecciona una opción...</option>
            {(c.opciones || []).map((opc: { nombre: string }, idx: number) => (
              <option key={idx} value={opc.nombre}>{opc.nombre}</option>
            ))}
          </select>
        );
      case 'checklist':
        return (
          <label className="flex items-center gap-3 p-2 bg-slate-50 rounded-md border border-slate-200 cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300 h-4 w-4"
              checked={!!values[c.id]} onChange={e => setValues({ ...values, [c.id]: e.target.checked })} />
            <span className="text-sm text-slate-700">{c.titulo}</span>
          </label>
        );
      case 'comprobante':
        return (
          <div className="space-y-2">
            <input type="file" accept="image/*"
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                try {
                  const res = await fetch(`${apiBase}/upload`, { method: 'POST', body: fd });
                  const data = await res.json();
                  setValues({ ...values, [c.id]: data.url });
                } catch { alert('Error subiendo imagen'); }
              }} />
            {values[c.id] && typeof values[c.id] === 'string' && (
              <img src={`${apiBase}${values[c.id]}`} alt="Comprobante" className="h-16 rounded border border-slate-200 object-cover" />
            )}
          </div>
        );
      case 'sublista': {
        const rows: Record<string, string>[] = Array.isArray(values[c.id]) ? values[c.id] : [];
        const cols: { nombre: string }[] = c.columnas || [];
        return (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="min-w-[480px] w-full overflow-hidden rounded border border-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {cols.map((col, ci) => <th key={ci} className="px-2 py-1.5 text-left text-xs font-semibold text-slate-600 border-b">{col.nombre}</th>)}
                  <th className="w-8 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((fila, fi) => (
                  <tr key={fi} className="border-b border-slate-100">
                    {cols.map((col, ci) => (
                      <td key={ci} className="px-1 py-1">
                        <input type="text" className="w-full px-2 py-1 text-sm border border-slate-200 rounded text-slate-900 bg-white"
                          placeholder={col.nombre} value={fila[col.nombre] || ''}
                          onChange={e => { const r = [...rows]; r[fi] = { ...r[fi], [col.nombre]: e.target.value }; setValues({ ...values, [c.id]: r }); }} />
                      </td>
                    ))}
                    <td className="px-1 text-center">
                      <button type="button" className="text-red-400 hover:text-red-600 text-xs"
                        onClick={() => { const r = [...rows]; r.splice(fi, 1); setValues({ ...values, [c.id]: r }); }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => {
                const emptyRow: Record<string, string> = {};
                cols.forEach(col => { emptyRow[col.nombre] = ''; });
                setValues({ ...values, [c.id]: [...rows, emptyRow] });
              }}>+ Agregar fila</button>
          </div>
        );
      }
      case 'persona': {
        const selected = values[c.id] as { id: string; label: string } | undefined;
        return (
          <div className="space-y-2">
            {selected ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                <span className="font-medium">{selected.label}</span>
                <button type="button" className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setValues({ ...values, [c.id]: undefined })}>Cambiar</button>
              </div>
            ) : (
              <PersonaSearchInput apiBase={apiBase}
                onSelect={(persona) => setValues({ ...values, [c.id]: { id: persona.id, label: `${persona.nombres} ${persona.apellidos} — ${persona.celular}` } })} />
            )}
          </div>
        );
      }
      case 'parrafo':
        return (
          <textarea required={c.requerido} rows={2} value={values[c.id] || ''} onChange={e => setValues({ ...values, [c.id]: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
        );
      default:
        return (
          <input type="text" required={c.requerido} value={values[c.id] || ''} onChange={e => setValues({ ...values, [c.id]: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
        );
    }
  };

  const asistenciasFiltradas = asistencias.filter((a) => {
    if (searchTermGlobal) {
      const q = searchTermGlobal.toLowerCase();
      const p = a.persona as any;
      if (!p.nombres?.toLowerCase().includes(q) &&
          !p.apellidos?.toLowerCase().includes(q) &&
          !p.documento?.includes(q) &&
          !(p.celular || '').includes(q)) {
        return false;
      }
    }
    for (const [campoId, valor] of Object.entries(filtrosValor)) {
      if (!valor) continue;
      const resp = a.datosPersonalizados?.[campoId];
      if (typeof resp === 'boolean') {
        if ((valor === 'Si' && !resp) || (valor === 'No' && resp)) return false;
      } else if (String(resp) !== valor) {
        return false;
      }
    }
    return true;
  });

  if (loading) return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando...</div>;
  if (!evento) return <div className="p-4 text-center text-red-500 sm:p-6 lg:p-8">Evento no encontrado.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link href="/admin/eventos" className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{evento.nombre}</h1>
          <p className="text-slate-500 text-sm">Registro administrativo de asistencias · {asistencias.length} registrado(s)</p>
        </div>
        <button onClick={() => { setShowRegistro(!showRegistro); setSuccessMsg(''); }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:w-auto">
          <UserPlus className="h-4 w-4" /> Agregar Persona
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {showRegistro && (
          <div className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
          <h2 className="font-semibold text-slate-800">Buscar y Registrar Asistente</h2>

          {!personaEncontrada && !isNewUser && (
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" required placeholder="Buscar por celular o documento..."
                  value={searchDoc} onChange={e => setSearchDoc(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400" />
              </div>
                <button type="submit" disabled={isSearching}
                  className="min-h-11 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto">Buscar</button>
            </form>
          )}

          {(personaEncontrada || isNewUser) && (
            <form onSubmit={handleRegister} className="space-y-4">
              {personaEncontrada ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  <strong>{personaEncontrada.nombres} {personaEncontrada.apellidos}</strong> — Cel: {personaEncontrada.celular}
                </div>
              ) : (
                 <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row">
                      <select className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 sm:w-28"
                      value={form.tipoDocumento} onChange={e => setForm({ ...form, tipoDocumento: e.target.value })}>
                      <option value="C.C">C.C</option><option value="T.I">T.I</option><option value="C.E">C.E</option>
                    </select>
                     <input required placeholder="Número de Documento *" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })}
                       className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 sm:flex-1" />
                     <input placeholder="Celular" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })}
                       className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 sm:w-40" />
                  </div>
                  <input required placeholder="Nombres *" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
                  <input required placeholder="Apellidos *" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
                  
                  <select required className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white"
                    value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}>
                    <option value="">Género *</option><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option>
                  </select>
                  <input required type="date" className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })} />
                  <input type="number" placeholder="Edad" className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.edad} onChange={e => setForm({ ...form, edad: e.target.value })} />
                  <input type="email" placeholder="Correo Electrónico" className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
                  <input type="text" placeholder="Dirección" className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                  <input type="text" placeholder="Barrio" className="min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.barrio} onChange={e => setForm({ ...form, barrio: e.target.value })} />
                </div>
              )}

              {evento.camposPersonalizados?.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campos del Evento</p>
                  {evento.camposPersonalizados.map((c: any) => (
                    <div key={c.id} className="space-y-1">
                      {c.tipo !== 'checklist' && (
                        <label className="text-sm font-medium text-slate-700">{c.titulo} {c.requerido && <span className="text-red-500">*</span>}</label>
                      )}
                      {renderCampoAdmin(c, respuestas, setRespuestas)}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <button type="button" onClick={() => { setPersonaEncontrada(null); setIsNewUser(false); setSearchDoc(''); }}
                  className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 sm:w-auto">Cambiar búsqueda</button>
                <button type="submit" disabled={submitting}
                  className="flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto">Registrar Asistencia</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative flex-1 md:min-w-[16rem] md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Buscar nombre, celular o doc..."
            value={searchTermGlobal} onChange={e => setSearchTermGlobal(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400" />
        </div>
        
        {evento.camposPersonalizados?.filter((c: any) => c.tipo === 'sino' || c.tipo === 'opciones').map((c: any) => (
          <select key={c.id} 
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 md:min-w-[150px]"
            value={filtrosValor[c.id] || ''} 
            onChange={e => setFiltrosValor({ ...filtrosValor, [c.id]: e.target.value })}>
            <option value="">Todos ({c.titulo})</option>
            {c.tipo === 'sino' ? (
              <><option value="Si">Sí</option><option value="No">No</option></>
            ) : (
              c.opciones?.map((o: any, i: number) => (
                <option key={i} value={o.nombre}>{o.nombre}</option>
              ))
            )}
          </select>
        ))}
        {(searchTermGlobal || Object.keys(filtrosValor).some(k => filtrosValor[k])) && (
            <button onClick={() => { setSearchTermGlobal(''); setFiltrosValor({}); }} 
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-600 transition-colors hover:text-red-800 md:px-2">Limpiar filtros</button>
        )}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="min-w-full rounded-lg border border-slate-200 bg-white shadow">
        <table className="min-w-max w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">#</th>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Documento</th>
              <th className="px-6 py-4 font-semibold">Celular</th>
              <th className="px-6 py-4 font-semibold min-w-[200px]">Fecha de Registro</th>
              {evento.camposPersonalizados?.map((c: any) => (
                <th key={c.id} className="px-6 py-4 font-semibold">{c.titulo}</th>
              ))}
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {asistenciasFiltradas.length === 0 ? (
              <tr><td colSpan={6 + (evento.camposPersonalizados?.length || 0)} className="px-6 py-8 text-center text-slate-500">No hay asistencias que coincidan con los filtros.</td></tr>
            ) : asistenciasFiltradas.map((a, i) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-500">{i + 1}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{a.persona?.nombres} {a.persona?.apellidos}</td>
                <td className="px-6 py-4 text-slate-600">{(a.persona as any)?.documento || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{a.persona?.celular || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{new Date(a.fechaAsistencia).toLocaleString('es-CO')}</td>
                {evento.camposPersonalizados?.map((c: any) => {
                  const valor = a.datosPersonalizados?.[c.id];
                  if (valor == null || valor === '') return <td key={c.id} className="px-6 py-4 text-slate-400">—</td>;

                  if (c.tipo === 'comprobante') {
                    return (
                      <td key={c.id} className="px-6 py-4">
                        <a href={`${apiBase}${valor}`} target="_blank" rel="noopener noreferrer">
                          <img src={`${apiBase}${valor}`} alt="Comprobante" className="h-10 w-auto rounded border border-slate-200 object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                        </a>
                      </td>
                    );
                  }
                  
                  if (c.tipo === 'checklist') {
                    return <td key={c.id} className="px-6 py-4 text-slate-600">{valor ? 'Sí' : 'No'}</td>;
                  }

                  if (c.tipo === 'persona') {
                    return <td key={c.id} className="px-6 py-4 text-slate-600">{valor.label || '—'}</td>;
                  }

                  if (c.tipo === 'sublista') {
                    const filas = valor as Record<string, string>[];
                    return (
                      <td key={c.id} className="px-6 py-4">
                        <div className="max-h-24 overflow-y-auto">
                          {filas.length} {filas.length === 1 ? 'fila' : 'filas'}
                        </div>
                      </td>
                    );
                  }

                  return <td key={c.id} className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={String(valor)}>{String(valor)}</td>;
                })}
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2 sm:flex-nowrap">
                    <button onClick={() => setViewingPersona(a.persona)} className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600" title="Ver Perfil Completo">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setEditingAsistencia(a); setEditRespuestas(a.datosPersonalizados || {}); }} className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-orange-600" title="Editar Registro">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal - Ver Perfil */}
      {viewingPersona && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Eye className="h-5 w-5 text-blue-500" /> Perfil de Asistente</h2>
              <button onClick={() => setViewingPersona(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-md text-center">
                <p className="text-lg font-bold text-slate-900">{viewingPersona.nombres} {viewingPersona.apellidos}</p>
                <p className="text-slate-500 font-medium tracking-wide mt-1">{viewingPersona.tipoDocumento} {viewingPersona.documento || 'Sin doc'}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><span className="font-medium text-slate-500">Celular:</span><br/>{viewingPersona.celular || '—'}</div>
                <div><span className="font-medium text-slate-500">Género:</span><br/>{viewingPersona.genero || '—'}</div>
                <div><span className="font-medium text-slate-500">Correo:</span><br/>{viewingPersona.correo || '—'}</div>
                <div><span className="font-medium text-slate-500">Dirección:</span><br/>{viewingPersona.direccion || '—'} ({viewingPersona.barrio || '—'})</div>
                <div><span className="font-medium text-slate-500">Edad:</span><br/>{viewingPersona.edad || '—'}</div>
                <div><span className="font-medium text-slate-500">Nacimiento:</span><br/>{viewingPersona.fechaNacimiento || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Editar Asistencia */}
      {editingAsistencia && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdate} className="bg-white rounded-lg border border-slate-200 shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Pencil className="h-5 w-5 text-orange-500" /> Editar Registro de Asistencia</h2>
              <button type="button" onClick={() => setEditingAsistencia(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
              <p className="text-sm font-medium text-slate-500 mb-4 bg-orange-50 p-2 rounded">Editando a: <strong className="text-slate-900">{editingAsistencia.persona?.nombres} {editingAsistencia.persona?.apellidos}</strong></p>
              
              {evento.camposPersonalizados?.length > 0 ? evento.camposPersonalizados.map((c: any) => (
                <div key={c.id} className="space-y-1">
                  {c.tipo !== 'checklist' && (
                    <label className="text-sm font-medium text-slate-700">{c.titulo} {c.requerido && <span className="text-red-500">*</span>}</label>
                  )}
                  {renderCampoAdmin(c, editRespuestas, setEditRespuestas)}
                </div>
              )) : (
                <div className="text-center text-slate-500 p-4">Este evento no tiene campos personalizados.</div>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditingAsistencia(null)} className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:w-auto">Cancelar</button>
              <button type="submit" disabled={submitting} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto">
                {submitting && <span className="animate-spin border-t-2 border-white rounded-full w-4 h-4" />}
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
