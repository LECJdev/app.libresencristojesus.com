'use client';

import { useEffect, useState, use } from 'react';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Search, UserPlus, CheckCircle2 } from 'lucide-react';
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
  const [form, setForm] = useState({ nombres: '', apellidos: '', celular: '', tipoDocumento: 'C.C', direccion: '', correo: '', edad: '', barrio: '', genero: '', fechaNacimiento: '' });
  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

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
      const { data } = await apiClient.get(`/personas/celular/${searchDoc}`);
      if (data) { setPersonaEncontrada(data); setIsNewUser(false); }
      else { setPersonaEncontrada(null); setIsNewUser(true); setForm(f => ({ ...f, celular: searchDoc })); }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setPersonaEncontrada(null); setIsNewUser(true); setForm(f => ({ ...f, celular: searchDoc }));
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
      setForm({ nombres: '', apellidos: '', celular: '', tipoDocumento: 'C.C', direccion: '', correo: '', edad: '', barrio: '', genero: '', fechaNacimiento: '' });
      fetchData();
    } catch { alert('Error registrando asistencia'); }
    finally { setSubmitting(false); }
  };

  const renderCampoAdmin = (c: any) => {
    switch (c.tipo) {
      case 'sino':
        return (
          <select required={c.requerido} value={respuestas[c.id] || ''} onChange={e => setRespuestas({ ...respuestas, [c.id]: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white">
            <option value="">Selecciona...</option><option value="Si">Sí</option><option value="No">No</option>
          </select>
        );
      case 'opciones':
        return (
          <select required={c.requerido} value={respuestas[c.id] || ''} onChange={e => setRespuestas({ ...respuestas, [c.id]: e.target.value })}
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
              checked={!!respuestas[c.id]} onChange={e => setRespuestas({ ...respuestas, [c.id]: e.target.checked })} />
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
                  setRespuestas({ ...respuestas, [c.id]: data.url });
                } catch { alert('Error subiendo imagen'); }
              }} />
            {respuestas[c.id] && typeof respuestas[c.id] === 'string' && (
              <img src={`${apiBase}${respuestas[c.id]}`} alt="Comprobante" className="h-16 rounded border border-slate-200 object-cover" />
            )}
          </div>
        );
      case 'sublista': {
        const rows: Record<string, string>[] = Array.isArray(respuestas[c.id]) ? respuestas[c.id] : [];
        const cols: { nombre: string }[] = c.columnas || [];
        return (
          <div className="space-y-2">
            <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
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
                          onChange={e => { const r = [...rows]; r[fi] = { ...r[fi], [col.nombre]: e.target.value }; setRespuestas({ ...respuestas, [c.id]: r }); }} />
                      </td>
                    ))}
                    <td className="px-1 text-center">
                      <button type="button" className="text-red-400 hover:text-red-600 text-xs"
                        onClick={() => { const r = [...rows]; r.splice(fi, 1); setRespuestas({ ...respuestas, [c.id]: r }); }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => {
                const emptyRow: Record<string, string> = {};
                cols.forEach(col => { emptyRow[col.nombre] = ''; });
                setRespuestas({ ...respuestas, [c.id]: [...rows, emptyRow] });
              }}>+ Agregar fila</button>
          </div>
        );
      }
      case 'persona': {
        const selected = respuestas[c.id] as { id: string; label: string } | undefined;
        return (
          <div className="space-y-2">
            {selected ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                <span className="font-medium">{selected.label}</span>
                <button type="button" className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setRespuestas({ ...respuestas, [c.id]: undefined })}>Cambiar</button>
              </div>
            ) : (
              <PersonaSearchInput apiBase={apiBase}
                onSelect={(persona) => setRespuestas({ ...respuestas, [c.id]: { id: persona.id, label: `${persona.nombres} ${persona.apellidos} — ${persona.celular}` } })} />
            )}
          </div>
        );
      }
      case 'parrafo':
        return (
          <textarea required={c.requerido} rows={2} value={respuestas[c.id] || ''} onChange={e => setRespuestas({ ...respuestas, [c.id]: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
        );
      default:
        return (
          <input type="text" required={c.requerido} value={respuestas[c.id] || ''} onChange={e => setRespuestas({ ...respuestas, [c.id]: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
        );
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;
  if (!evento) return <div className="p-8 text-center text-red-500">Evento no encontrado.</div>;

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/eventos" className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{evento.nombre}</h1>
          <p className="text-slate-500 text-sm">Registro administrativo de asistencias · {asistencias.length} registrado(s)</p>
        </div>
        <button onClick={() => { setShowRegistro(!showRegistro); setSuccessMsg(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm">
          <UserPlus className="h-4 w-4" /> Agregar Persona
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {showRegistro && (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Buscar y Registrar Asistente</h2>

          {!personaEncontrada && !isNewUser && (
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" required placeholder="Buscar por celular o documento..."
                  value={searchDoc} onChange={e => setSearchDoc(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white placeholder:text-slate-400" />
              </div>
              <button type="submit" disabled={isSearching}
                className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800">Buscar</button>
            </form>
          )}

          {(personaEncontrada || isNewUser) && (
            <form onSubmit={handleRegister} className="space-y-4">
              {personaEncontrada ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  <strong>{personaEncontrada.nombres} {personaEncontrada.apellidos}</strong> — Cel: {personaEncontrada.celular}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 flex gap-2">
                    <select className="w-1/3 px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white"
                      value={form.tipoDocumento} onChange={e => setForm({ ...form, tipoDocumento: e.target.value })}>
                      <option value="C.C">C.C</option><option value="T.I">T.I</option><option value="C.E">C.E</option>
                    </select>
                    <input disabled value={form.celular} className="w-2/3 border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-100 text-slate-500" />
                  </div>
                  <input required placeholder="Nombres *" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })}
                    className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
                  <input required placeholder="Apellidos *" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })}
                    className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400" />
                  
                  <select required className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                    value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}>
                    <option value="">Género *</option><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option>
                  </select>
                  <input required type="date" className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })} />
                  <input type="number" placeholder="Edad" className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.edad} onChange={e => setForm({ ...form, edad: e.target.value })} />
                  <input type="email" placeholder="Correo Electrónico" className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
                  <input type="text" placeholder="Dirección" className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                    value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                  <input type="text" placeholder="Barrio" className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400"
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
                      {renderCampoAdmin(c)}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setPersonaEncontrada(null); setIsNewUser(false); setSearchDoc(''); }}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">Cambiar búsqueda</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium">Registrar Asistencia</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">#</th>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Celular</th>
              <th className="px-6 py-4 font-semibold">Fecha de Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {asistencias.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay asistencias registradas para este evento.</td></tr>
            ) : asistencias.map((a, i) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-500">{i + 1}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{a.persona?.nombres} {a.persona?.apellidos}</td>
                <td className="px-6 py-4 text-slate-600">{a.persona?.celular || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{new Date(a.fechaAsistencia).toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
