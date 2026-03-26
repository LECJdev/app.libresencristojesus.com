'use client';

import { useEffect, useState, use } from 'react';
import { QRCode } from 'react-qrcode-logo';
import axios from 'axios';
import { Search, CheckCircle2, User, UserPlus, QrCode } from 'lucide-react';
import PersonaSearchInput from '@/components/PersonaSearchInput';

export default function RegistroPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [evento, setEvento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [searchDoc, setSearchDoc] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', celular: '', tipoDocumento: 'C.C',
    direccion: '', correo: '', edad: '', barrio: '', genero: '', fechaNacimiento: ''
  });

  const [respuestas, setRespuestas] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        const res = await axios.get(`${apiBase}/eventos/${resolvedParams.id}`);
        setEvento(res.data);
      } catch (error) {
        console.error('Error cargando evento:', error);
        setErrorMsg('El evento no existe o no está disponible.');
      } finally { setLoading(false); }
    };
    fetchEvento();
  }, [resolvedParams.id, apiBase]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDoc.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`${apiBase}/personas/celular/${searchDoc}`);
      if (res.data) { setPersonaEncontrada(res.data); setIsNewUser(false); }
      else { setPersonaEncontrada(null); setIsNewUser(true); setFormData(prev => ({ ...prev, celular: searchDoc })); }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setPersonaEncontrada(null); setIsNewUser(true); setFormData(prev => ({ ...prev, celular: searchDoc }));
      } else { alert('Error conectando con el servidor. Intenta de nuevo.'); }
    } finally { setIsSearching(false); }
  };

  const checkRequiredFields = () => {
    if (!evento?.camposPersonalizados) return true;
    for (const campo of evento.camposPersonalizados) {
      if (campo.administrativo) continue;
      if (campo.requerido && (respuestas[campo.id] === undefined || respuestas[campo.id] === '')) return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRequiredFields()) { alert('Por favor, completa todos los campos requeridos del evento.'); return; }
    setSubmitting(true);
    try {
      let personaId = personaEncontrada?.id;
      if (isNewUser) {
        const payloadPersona = { ...formData, edad: formData.edad ? parseInt(formData.edad) : null };
        const resPersona = await axios.post(`${apiBase}/personas`, payloadPersona);
        personaId = resPersona.data.id;
      }
      await axios.post(`${apiBase}/asistencias/evento`, {
        evento: { id: evento.id }, persona: { id: personaId }, datosPersonalizados: respuestas
      });
      setSuccess(true);
    } catch (error) {
      console.error('Error registrando asistencia', error);
      alert('Hubo un error al registrar tu asistencia.');
    } finally { setSubmitting(false); }
  };

  const resetFlow = () => {
    setSearchDoc('');
    setPersonaEncontrada(null);
    setIsNewUser(false);
    setFormData({ nombres: '', apellidos: '', celular: '', tipoDocumento: 'C.C', direccion: '', correo: '', edad: '', barrio: '', genero: '', fechaNacimiento: '' });
    setRespuestas({});
    setSuccess(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando evento...</div>;
  if (errorMsg) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-600 font-medium">{errorMsg}</div>;
  
  if (!evento || evento.estado !== 'ACTIVO' || !evento.generaQr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-medium text-slate-700">
        El enlace de registro para este evento está inactivo o cerrado.
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white max-w-sm w-full p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Asistencia Confirmada!</h2>
          <p className="text-slate-500 mb-8">
            El registro de {personaEncontrada?.nombres || formData.nombres} ha sido guardado exitosamente.
          </p>
          <button onClick={resetFlow}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-md">
            Registrar a otra persona
          </button>
        </div>
      </div>
    );
  }

  const publicUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Render a dynamic field based on its type
  const renderCampoDinamico = (campo: any) => {
    switch (campo.tipo) {
      case 'sino':
        return (
          <select required={campo.requerido}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 bg-white cursor-pointer"
            value={respuestas[campo.id] || ''}
            onChange={(e) => setRespuestas({ ...respuestas, [campo.id]: e.target.value })}>
            <option value="">Selecciona...</option>
            <option value="Si">Sí</option>
            <option value="No">No</option>
          </select>
        );

      case 'opciones':
        return (
          <select required={campo.requerido}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 bg-white cursor-pointer"
            value={respuestas[campo.id] || ''}
            onChange={(e) => setRespuestas({ ...respuestas, [campo.id]: e.target.value })}>
            <option value="">Selecciona una opción...</option>
            {(campo.opciones || []).map((opc: { nombre: string }, idx: number) => (
              <option key={idx} value={opc.nombre}>{opc.nombre}</option>
            ))}
          </select>
        );

      case 'checklist':
        return (
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-5 w-5"
              checked={!!respuestas[campo.id]}
              onChange={(e) => setRespuestas({ ...respuestas, [campo.id]: e.target.checked })} />
            <span className="text-sm text-slate-700">{campo.titulo} {campo.requerido && <span className="text-red-500">*</span>}</span>
          </label>
        );

      case 'comprobante':
        return (
          <div className="space-y-2">
            <input type="file" accept="image/*"
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                try {
                  const res = await fetch(`${apiBase}/upload`, { method: 'POST', body: fd });
                  const data = await res.json();
                  setRespuestas({ ...respuestas, [campo.id]: data.url });
                } catch { alert('Error subiendo imagen'); }
              }} />
            {respuestas[campo.id] && typeof respuestas[campo.id] === 'string' && (
              <img src={`${apiBase}${respuestas[campo.id]}`} alt="Comprobante"
                className="h-24 w-auto rounded-md border border-slate-200 object-cover" />
            )}
          </div>
        );

      case 'sublista': {
        const rows: Record<string, string>[] = Array.isArray(respuestas[campo.id]) ? respuestas[campo.id] : [];
        const cols: { nombre: string }[] = campo.columnas || [];
        return (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-md overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    {cols.map((col, ci) => (
                      <th key={ci} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{col.nombre}</th>
                    ))}
                    <th className="px-2 py-2 w-10 border-b border-slate-200"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((fila, fi) => (
                    <tr key={fi} className="border-b border-slate-100">
                      {cols.map((col, ci) => (
                        <td key={ci} className="px-2 py-1">
                          <input type="text"
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded text-slate-900 bg-white placeholder:text-slate-400"
                            placeholder={col.nombre}
                            value={fila[col.nombre] || ''}
                            onChange={(e) => {
                              const newRows = [...rows];
                              newRows[fi] = { ...newRows[fi], [col.nombre]: e.target.value };
                              setRespuestas({ ...respuestas, [campo.id]: newRows });
                            }} />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center">
                        <button type="button" className="text-red-400 hover:text-red-600 text-xs"
                          onClick={() => {
                            const newRows = [...rows]; newRows.splice(fi, 1);
                            setRespuestas({ ...respuestas, [campo.id]: newRows });
                          }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => {
                const emptyRow: Record<string, string> = {};
                cols.forEach((col) => { emptyRow[col.nombre] = ''; });
                setRespuestas({ ...respuestas, [campo.id]: [...rows, emptyRow] });
              }}>
              + Agregar fila
            </button>
          </div>
        );
      }

      case 'persona': {
        const selected = respuestas[campo.id] as { id: string; label: string } | undefined;
        return (
          <div className="space-y-2">
            {selected ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                <span className="font-medium">{selected.label}</span>
                <button type="button" className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setRespuestas({ ...respuestas, [campo.id]: undefined })}>Cambiar</button>
              </div>
            ) : (
              <PersonaSearchInput apiBase={apiBase}
                onSelect={(persona) => setRespuestas({ ...respuestas, [campo.id]: { id: persona.id, label: `${persona.nombres} ${persona.apellidos} — ${persona.celular}` } })} />
            )}
          </div>
        );
      }

      case 'parrafo':
        return (
          <textarea required={campo.requerido} rows={3}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400"
            value={respuestas[campo.id] || ''}
            onChange={(e) => setRespuestas({ ...respuestas, [campo.id]: e.target.value })} />
        );

      default: // texto
        return (
          <input type="text" required={campo.requerido}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400"
            value={respuestas[campo.id] || ''}
            onChange={(e) => setRespuestas({ ...respuestas, [campo.id]: e.target.value })} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Encabezado y QR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-center relative">
          <div className="bg-slate-900 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold mb-2">{evento.nombre}</h1>
            <p className="text-slate-300 text-sm">Registro de Asistencia Oficial</p>
          </div>
          <div className="p-6 flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-4 tracking-wide uppercase font-semibold flex items-center gap-2">
              <QrCode className="h-4 w-4" /> Muestra o Escanea este QR
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl shadow-inner inline-block">
              <QRCode value={publicUrl} size={180} qrStyle="dots" eyeRadius={8} fgColor="#0f172a" />
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed max-w-xs">
              Usa este código para compartir rápidamente la página de registro con quienes te acompañan.
            </p>
          </div>
        </div>

        {/* Formulario Principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          
          {/* PASO 1: Búsqueda */}
          {!personaEncontrada && !isNewUser && (
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Busca tu registro</h2>
              <p className="text-slate-500 text-sm mb-6">
                Ingresa tu número de documento o celular para verificar si ya estás en nuestro sistema.
              </p>
              
              <form onSubmit={handleSearch} className="space-y-4">
                <input type="text" required placeholder="Número de documento / celular"
                  className="w-full text-center text-lg px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 bg-white placeholder:text-slate-400"
                  value={searchDoc} onChange={(e) => setSearchDoc(e.target.value)} />
                <button type="submit" disabled={isSearching}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow flex justify-center items-center">
                  {isSearching ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Buscar Persona'}
                </button>
              </form>
            </div>
          )}

          {/* PASO 2: Confirmación y/o Completado de Datos */}
          {(personaEncontrada || isNewUser) && (
            <form onSubmit={handleRegister} className="space-y-6">
              
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-slate-800">
                  {isNewUser ? 'Registro de Usuario Nuevo' : 'Confirma tu Asistencia'}
                </h2>
                <button type="button" onClick={resetFlow} className="text-xs text-blue-600 hover:underline font-medium">Cambiar ID</button>
              </div>

              {personaEncontrada ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                  <div className="bg-white p-2 rounded-full shadow-sm"><User className="h-6 w-6 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-blue-800 font-semibold">{personaEncontrada.nombres} {personaEncontrada.apellidos}</p>
                    <p className="text-xs text-blue-600 opacity-80">Doc/Cel: {personaEncontrada.celular}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Eres nuevo. Completa tus datos básicos:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nombres *"
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400"
                      value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} />
                    <input required type="text" placeholder="Apellidos *"
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400"
                      value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} />
                    <div className="col-span-2 flex gap-2 mb-2">
                      <select className="w-1/3 px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white"
                        value={formData.tipoDocumento} onChange={(e) => setFormData({...formData, tipoDocumento: e.target.value})}>
                        <option value="C.C">C.C</option>
                        <option value="T.I">T.I</option>
                        <option value="C.E">C.E</option>
                      </select>
                      <input required type="text" placeholder="Número / Celular *" disabled
                        className="w-2/3 px-3 py-2 text-sm rounded-md border border-slate-300 bg-slate-100 text-slate-500 placeholder:text-slate-400"
                        value={formData.celular} />
                    </div>

                    {/* Nuevos Datos Biográficos */}
                    <select required className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white"
                      value={formData.genero} onChange={(e) => setFormData({...formData, genero: e.target.value})}>
                      <option value="">Género *</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                    </select>
                    
                    <input required type="date" placeholder="Fecha Nacimiento *"
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400"
                      value={formData.fechaNacimiento} onChange={(e) => setFormData({...formData, fechaNacimiento: e.target.value})} />

                    <input type="number" placeholder="Edad"
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400"
                      value={formData.edad} onChange={(e) => setFormData({...formData, edad: e.target.value})} />

                    <input type="email" placeholder="Correo Electrónico"
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400"
                      value={formData.correo} onChange={(e) => setFormData({...formData, correo: e.target.value})} />

                    <input type="text" placeholder="Dirección"
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400"
                      value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />

                    <input type="text" placeholder="Barrio"
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-900 bg-white placeholder:text-slate-400"
                      value={formData.barrio} onChange={(e) => setFormData({...formData, barrio: e.target.value})} />

                  </div>
                </div>
              )}

              {/* Preguntas Dinámicas del Evento */}
              {evento?.camposPersonalizados && evento.camposPersonalizados.some((c: any) => !c.administrativo) && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Preguntas Específicas del Evento</h3>
                  {evento.camposPersonalizados.filter((c: any) => !c.administrativo).map((campo: any) => (
                    <div key={campo.id} className="space-y-1">
                      {campo.tipo !== 'checklist' && (
                        <label className="text-sm font-medium text-slate-800">
                          {campo.titulo} {campo.requerido && <span className="text-red-500">*</span>}
                        </label>
                      )}
                      {renderCampoDinamico(campo)}
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 px-4 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2 mt-4">
                {submitting ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>Registrar Asistencia</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
