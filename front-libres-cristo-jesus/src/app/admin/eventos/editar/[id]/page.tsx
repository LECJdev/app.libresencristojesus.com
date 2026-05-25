'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Save, Plus, Trash2, Info } from 'lucide-react';
import Link from 'next/link';

interface CampoColumna {
  nombre: string;
  tipo: string;
}

interface CampoOpcion {
  nombre: string;
}

interface CampoPersonalizado {
  id: string;
  titulo: string;
  tipo: string;
  requerido: boolean;
  administrativo: boolean;
  columnas?: CampoColumna[];
  opciones?: CampoOpcion[];
}

export default function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    nombre: '',
    estado: 'ACTIVO',
    generaQr: true,
  });
  const [campos, setCampos] = useState<CampoPersonalizado[]>([]);

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        const { data } = await apiClient.get(`/eventos/${resolvedParams.id}`);
        setFormData({
          nombre: data.nombre,
          estado: data.estado,
          generaQr: data.generaQr,
        });
        setCampos(data.camposPersonalizados || []);
      } catch (error) {
        console.error('Error cargando evento:', error);
        alert('No se pudo cargar el evento');
      } finally {
        setFetching(false);
      }
    };
    fetchEvento();
  }, [resolvedParams.id]);

  const handleAddCampo = () => {
    setCampos([
      ...campos,
      { id: Date.now().toString(), titulo: '', tipo: 'texto', requerido: false, administrativo: false }
    ]);
  };

  const handleRemoveCampo = (id: string) => {
    setCampos(campos.filter((c) => c.id !== id));
  };

  const handleChangeCampo = (id: string, field: string, value: any) => {
    setCampos(
      campos.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: value };
          if (field === 'tipo' && value === 'sublista') {
            updated.columnas = [{ nombre: '', tipo: 'texto' }];
          }
          if (field === 'tipo' && value === 'opciones') {
            updated.opciones = [{ nombre: '' }];
          }
          return updated;
        }
        return c;
      })
    );
  };

  const handleAddColumna = (campoId: string) => {
    setCampos(
      campos.map((c) => {
        if (c.id === campoId) {
          return { ...c, columnas: [...(c.columnas || []), { nombre: '', tipo: 'texto' }] };
        }
        return c;
      })
    );
  };

  const handleChangeColumna = (campoId: string, idx: number, field: string, value: string) => {
    setCampos(
      campos.map((c) => {
        if (c.id === campoId && c.columnas) {
          const newCols = [...c.columnas];
          newCols[idx] = { ...newCols[idx], [field]: value };
          return { ...c, columnas: newCols };
        }
        return c;
      })
    );
  };

  const handleRemoveColumna = (campoId: string, idx: number) => {
    setCampos(
      campos.map((c) => {
        if (c.id === campoId && c.columnas) {
          return { ...c, columnas: c.columnas.filter((_, i) => i !== idx) };
        }
        return c;
      })
    );
  };

  const handleAddOpcion = (campoId: string) => {
    setCampos(
      campos.map((c) => {
        if (c.id === campoId) {
          return { ...c, opciones: [...(c.opciones || []), { nombre: '' }] };
        }
        return c;
      })
    );
  };

  const handleChangeOpcion = (campoId: string, idx: number, value: string) => {
    setCampos(
      campos.map((c) => {
        if (c.id === campoId && c.opciones) {
          const newOps = [...c.opciones];
          newOps[idx] = { nombre: value };
          return { ...c, opciones: newOps };
        }
        return c;
      })
    );
  };

  const handleRemoveOpcion = (campoId: string, idx: number) => {
    setCampos(
      campos.map((c) => {
        if (c.id === campoId && c.opciones) {
          return { ...c, opciones: c.opciones.filter((_, i) => i !== idx) };
        }
        return c;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return alert('El nombre es obligatorio');

    setLoading(true);
    try {
      await apiClient.put(`/eventos/${resolvedParams.id}`, {
        ...formData,
        camposPersonalizados: campos,
      });
      router.push('/admin/eventos');
    } catch (error) {
      console.error('Error actualizando evento', error);
      alert('Hubo un error al actualizar el evento');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando datos del evento...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/admin/eventos" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar Evento</h1>
          <p className="text-slate-500">Actualiza los detalles y los campos personalizados del evento.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nombre del Evento *</label>
              <input type="text" required
                className="w-full border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                placeholder="Ej. Congreso Anual 2026"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Estado</label>
              <select
                className="w-full border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 bg-white"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox"
                  className="rounded border-slate-300 focus:ring-slate-500 text-slate-900 bg-white"
                  checked={formData.generaQr}
                  onChange={(e) => setFormData({ ...formData, generaQr: e.target.checked })} />
                Generar acceso mediante código QR público
              </label>
              <p className="text-xs text-slate-500 ml-6">
                Si está marcado, las personas podrán registrarse mediante un enlace público escaneando un QR.
              </p>
            </div>
          </div>
        </div>

        {/* Campos predeterminados de persona (informativo) */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Campos predeterminados de la persona</p>
            <p className="text-xs text-blue-600 mt-1">
              Al registrarse, el sistema siempre pedirá o mostrará automáticamente: <strong>Nombre</strong>, <strong>Celular</strong> y <strong>Documento</strong>.
              Estos datos se obtienen de la vinculación con la persona y no necesitan configurarse aquí.
            </p>
          </div>
        </div>

        {/* Campos Personalizados */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
          <div className="-mx-4 -mt-4 flex flex-col gap-3 rounded-t-lg border-b bg-slate-50 p-4 sm:-mx-6 sm:-mt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Campos Personalizados (Opcional)</h2>
              <p className="text-sm text-slate-500">Agrega preguntas o secciones específicas para este evento.</p>
            </div>
            <button type="button" onClick={handleAddCampo}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto">
              <Plus className="h-4 w-4" /> Agregar Campo
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {campos.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-md">
                No has agregado campos personalizados. Se pedirán los datos estándar de inicio (Nombres, DNI, etc).
              </div>
            ) : (
              campos.map((campo, index) => (
                 <div key={campo.id} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {/* Header del campo */}
                   <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                        Campo {index + 1}
                      </label>
                      <input type="text" required
                        placeholder="Ej. ¿Tienes alguna restricción alimenticia?"
                        className="w-full border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                        value={campo.titulo}
                        onChange={(e) => handleChangeCampo(campo.id, 'titulo', e.target.value)} />
                    </div>
                     <div className="w-full space-y-1 lg:w-44">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Tipo</label>
                      <select
                        className="w-full border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 bg-white"
                        value={campo.tipo}
                        onChange={(e) => handleChangeCampo(campo.id, 'tipo', e.target.value)}>
                        <option value="texto">Texto corto</option>
                        <option value="parrafo">Párrafo largo</option>
                        <option value="sino">Sí / No</option>
                        <option value="opciones">Opciones (Única Selección)</option>
                        <option value="checklist">Checklist ✓</option>
                        <option value="comprobante">Comprobante 📎</option>
                        <option value="sublista">Sublista 📋</option>
                        <option value="persona">Persona 👤</option>
                      </select>
                    </div>
                    <div className="pb-2 px-1 shrink-0 flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" className="rounded border-slate-300 focus:ring-slate-500 text-slate-900 bg-white"
                          checked={campo.requerido}
                          onChange={(e) => handleChangeCampo(campo.id, 'requerido', e.target.checked)} />
                        Obligatorio
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer text-orange-600 font-medium pb-2 border-b border-orange-100" title="Solo visible en el panel de administrador">
                        <input type="checkbox" className="rounded border-orange-400 focus:ring-orange-500 text-orange-600 bg-orange-50"
                          checked={campo.administrativo}
                          onChange={(e) => handleChangeCampo(campo.id, 'administrativo', e.target.checked)} />
                        Solo Admin 🛡️
                      </label>
                    </div>
                    <button type="button" onClick={() => handleRemoveCampo(campo.id)}
                      className="inline-flex h-10 w-10 items-center justify-center self-start rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 lg:self-auto" title="Eliminar campo">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Configuración extra para Sublista */}
                  {campo.tipo === 'sublista' && (
                    <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Columnas de la sublista</p>
                        <button type="button" onClick={() => handleAddColumna(campo.id)}
                          className="flex min-h-9 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                          <Plus className="h-3 w-3" /> Agregar columna
                        </button>
                      </div>
                      {(campo.columnas || []).map((col: any, idx: number) => (
                         <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input type="text" required
                            placeholder={`Nombre de columna ${idx + 1}`}
                            className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                            value={col.nombre}
                            onChange={(e) => handleChangeColumna(campo.id, idx, 'nombre', e.target.value)} />
                          <button type="button" onClick={() => handleRemoveColumna(campo.id, idx)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600" title="Eliminar columna">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {(!campo.columnas || campo.columnas.length === 0) && (
                        <p className="text-xs text-slate-400 italic">Agrega al menos una columna (ej. Nombre, Celular, Ciudad).</p>
                      )}
                    </div>
                  )}

                  {campo.tipo === 'opciones' && (
                    <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Opciones disponibles</p>
                        <button type="button" onClick={() => handleAddOpcion(campo.id)}
                          className="flex min-h-9 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                          <Plus className="h-3 w-3" /> Agregar opción
                        </button>
                      </div>
                      {(campo.opciones || []).map((opc: any, idx: number) => (
                         <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input type="text" required
                            placeholder={`Opción ${idx + 1} (Ej. Distrito Norte)`}
                            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                            value={opc.nombre}
                            onChange={(e) => handleChangeOpcion(campo.id, idx, e.target.value)} />
                          <button type="button" onClick={() => handleRemoveOpcion(campo.id, idx)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Helpers y Pistas visuales */}
                  {campo.tipo === 'sino' && (
                    <p className="text-xs text-slate-400 italic ml-1">↳ Se mostrará un selector con Sí y No.</p>
                  )}
                  {campo.tipo === 'checklist' && (
                    <p className="text-xs text-slate-400 italic ml-1">↳ Se mostrará como un checkbox que el asistente puede marcar.</p>
                  )}
                  {campo.tipo === 'comprobante' && (
                    <p className="text-xs text-slate-400 italic ml-1">↳ Se mostrará un botón para subir una imagen como comprobante.</p>
                  )}
                  {campo.tipo === 'persona' && (
                    <p className="text-xs text-slate-400 italic ml-1">↳ Se mostrará un buscador por documento/celular para seleccionar una persona del sistema.</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-stretch pt-4 sm:justify-end">
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:w-auto">
            {loading ? (
              <span className="animate-spin border-t-2 border-white rounded-full w-4 h-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}
