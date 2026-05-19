'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { apiClient } from '@/lib/api';
import { Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import { useUserStorage } from '@/hooks/useUserStorage';

type Step =
  | 'LOADING'
  | 'ASK_DOCUMENT'
  | 'REGISTER_NEW'
  | 'SUCCESS'
  | 'ALREADY_REGISTERED'
  | 'ERROR';

type TipoDocumento = 'C.C' | 'T.I.' | 'PT' | 'C.E.';

interface PublicAsistenciaDicipulado {
  id: string;
  nombre: string;
  diaRegistro: string;
  estado: 'ACTIVO' | 'INACTIVO';
  sede: { id: string; nombre: string | null } | null;
  red: { id: string; nombre: string | null } | null;
  direccionPersonalizada: string | null;
}

interface RegistroResponse {
  alreadyRegistered: boolean;
  esNuevo: boolean;
  persona: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    documento: string | null;
  };
  registroId: string;
  fechaRegistro: string;
}

interface PersonaForm {
  nombres: string;
  apellidos: string;
  celular: string;
  tipoDocumento: TipoDocumento;
  direccion: string;
  correo: string;
  edad: string;
  barrio: string;
}

const EMPTY_FORM: PersonaForm = {
  nombres: '',
  apellidos: '',
  celular: '',
  tipoDocumento: 'C.C',
  direccion: '',
  correo: '',
  edad: '',
  barrio: '',
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as {
      response?: { data?: { message?: string | string[] } };
    }).response;

    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    return typeof response?.status === 'number' ? response.status : null;
  }

  return null;
}

function shouldLogAsError(status: number | null): boolean {
  return status === null || status >= 500;
}

export default function RegistroDicipuladoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const { userData, saveUserData, clearUserData, isLoaded } = useUserStorage();

  const [asistencia, setAsistencia] = useState<PublicAsistenciaDicipulado | null>(
    null,
  );
  const [step, setStep] = useState<Step>('LOADING');
  const [errorMsg, setErrorMsg] = useState('');
  const [documento, setDocumento] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [personaForm, setPersonaForm] = useState<PersonaForm>(EMPTY_FORM);
  const [lastResult, setLastResult] = useState<RegistroResponse | null>(null);

  const displayName = useMemo(() => {
    if (!lastResult?.persona) return '';
    return `${lastResult.persona.nombres || ''} ${lastResult.persona.apellidos || ''}`.trim();
  }, [lastResult]);

  const ubicacion = useMemo(() => {
    if (!asistencia) return '—';
    return asistencia.sede?.nombre || asistencia.direccionPersonalizada || '—';
  }, [asistencia]);

  const fetchAsistenciaPublica = async () => {
    try {
      const { data } = await apiClient.get<PublicAsistenciaDicipulado>(
        `/asistencias-dicipulados/public/${resolvedParams.token}`,
      );
      setAsistencia(data);
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      if (shouldLogAsError(status)) {
        console.error(error);
      }
      setErrorMsg('No se encontró una asistencia válida para este QR.');
      setStep('ERROR');
    }
  };

  const handleRegistrarOtraPersona = () => {
    clearUserData();
    setLastResult(null);
    setPersonaForm(EMPTY_FORM);
    setDocumento('');
    setErrorMsg('');
    setStep('ASK_DOCUMENT');
  };

  useEffect(() => {
    fetchAsistenciaPublica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.token]);

  useEffect(() => {
    if (!asistencia || !isLoaded) return;

    if (userData?.documento) {
      setDocumento(userData.documento);
      registrarConDocumento(userData.documento);
      return;
    }

    setStep('ASK_DOCUMENT');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asistencia, isLoaded]);

  const manejarExito = (response: RegistroResponse) => {
    setLastResult(response);

    const documentoFinal = response.persona.documento || documento;
    saveUserData({
      id: response.persona.id,
      nombres: response.persona.nombres || '',
      apellidos: response.persona.apellidos || '',
      documento: documentoFinal,
    });

    setStep(response.alreadyRegistered ? 'ALREADY_REGISTERED' : 'SUCCESS');
  };

  const registrarConDocumento = async (doc: string) => {
    if (!doc.trim()) return;

    setLoadingAction(true);
    setErrorMsg('');

    try {
      const { data } = await apiClient.post<RegistroResponse>(
        `/asistencias-dicipulados/public/${resolvedParams.token}/registrar`,
        { documento: doc.trim() },
      );

      manejarExito(data);
    } catch (error: unknown) {
      const status = getErrorStatus(error);

      if (status === 404) {
        setDocumento(doc.trim());
        setStep('REGISTER_NEW');
      } else {
        if (shouldLogAsError(status)) {
          console.error(error);
        }
        setErrorMsg(getErrorMessage(error, 'Error registrando asistencia.'));
        setStep('ERROR');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSubmitDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    await registrarConDocumento(documento);
  };

  const handleSubmitPersonaNueva = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoadingAction(true);
    setErrorMsg('');

    try {
      const { data } = await apiClient.post<RegistroResponse>(
        `/asistencias-dicipulados/public/${resolvedParams.token}/registrar`,
        {
          documento: documento.trim(),
          persona: {
            nombres: personaForm.nombres,
            apellidos: personaForm.apellidos,
            celular: personaForm.celular,
            tipoDocumento: personaForm.tipoDocumento,
            direccion: personaForm.direccion || undefined,
            correo: personaForm.correo || undefined,
            edad: personaForm.edad ? Number(personaForm.edad) : undefined,
            barrio: personaForm.barrio || undefined,
          },
        },
      );

      manejarExito(data);
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      if (shouldLogAsError(status)) {
        console.error(error);
      }
      setErrorMsg(getErrorMessage(error, 'Error registrando persona.'));
      setStep('ERROR');
    } finally {
      setLoadingAction(false);
    }
  };

  if (step === 'LOADING' || loadingAction) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-slate-600">Procesando tu asistencia...</p>
      </div>
    );
  }

  if (step === 'ERROR') {
    return (
      <div className="w-full max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">
        <h3 className="text-lg font-semibold mb-2">No fue posible registrar asistencia</h3>
        <p>{errorMsg}</p>
      </div>
    );
  }

  if (step === 'SUCCESS' || step === 'ALREADY_REGISTERED') {
    const title =
      step === 'ALREADY_REGISTERED'
        ? 'Ya estabas registrado hoy'
        : '¡Asistencia registrada!';

    const message =
      step === 'ALREADY_REGISTERED'
        ? 'Tu asistencia para la fecha actual ya estaba registrada.'
        : 'Tu asistencia de dicipulado quedó registrada correctamente.';

    const actionLabel =
      step === 'ALREADY_REGISTERED'
        ? 'Registrar a otra persona'
        : 'Registrar otra persona';

    return (
      <div className="w-full max-w-md mx-auto mt-8 p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="flex justify-center mb-5">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-500 mb-6">{message}</p>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-left text-sm text-slate-700 space-y-1">
          <p>
            <span className="font-semibold">Asistencia:</span> {asistencia?.nombre}
          </p>
          <p>
            <span className="font-semibold">Ubicación:</span> {ubicacion}
          </p>
          <p>
            <span className="font-semibold">Red:</span> {asistencia?.red?.nombre || '—'}
          </p>
          <p>
            <span className="font-semibold">Persona:</span> {displayName || '—'}
          </p>
          <p>
            <span className="font-semibold">Documento:</span>{' '}
            {lastResult?.persona.documento || documento}
          </p>
          <p>
            <span className="font-semibold">Fecha:</span> {lastResult?.fechaRegistro}
          </p>
          <p>
            <span className="font-semibold">Tipo:</span>{' '}
            {lastResult?.esNuevo ? 'NUEVA' : 'EXISTENTE'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegistrarOtraPersona}
          className="mt-5 w-full bg-slate-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-slate-800"
        >
          {actionLabel}
        </button>
      </div>
    );
  }

  if (step === 'ASK_DOCUMENT') {
    return (
      <div className="w-full max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          Registro Dicipulado
        </h2>
        <p className="text-sm text-slate-500 mb-2">{asistencia?.nombre}</p>
        <p className="text-sm text-slate-500 mb-5">{ubicacion}</p>

        <form onSubmit={handleSubmitDocumento} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Documento de identidad o extranjería
            </label>
            <input
              type="text"
              required
              value={documento}
              onChange={(e) => setDocumento(e.target.value.trim())}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
              placeholder="Ej: 1012345678"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-slate-800"
          >
            Continuar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-4 text-blue-600">
        <UserPlus className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Persona nueva</h2>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        No encontramos el documento <strong>{documento}</strong>. Completá el registro.
      </p>

      <form onSubmit={handleSubmitPersonaNueva} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            placeholder="Nombres"
            value={personaForm.nombres}
            onChange={(e) =>
              setPersonaForm((prev) => ({ ...prev, nombres: e.target.value }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          />
          <input
            required
            placeholder="Apellidos"
            value={personaForm.apellidos}
            onChange={(e) =>
              setPersonaForm((prev) => ({ ...prev, apellidos: e.target.value }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            placeholder="Celular"
            value={personaForm.celular}
            onChange={(e) =>
              setPersonaForm((prev) => ({
                ...prev,
                celular: e.target.value.replace(/\D/g, ''),
              }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          />
          <select
            value={personaForm.tipoDocumento}
            onChange={(e) =>
              setPersonaForm((prev) => ({
                ...prev,
                tipoDocumento: e.target.value as TipoDocumento,
              }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          >
            <option value="C.C">C.C</option>
            <option value="T.I.">T.I.</option>
            <option value="PT">PT</option>
            <option value="C.E.">C.E.</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Correo"
            value={personaForm.correo}
            onChange={(e) =>
              setPersonaForm((prev) => ({ ...prev, correo: e.target.value }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          />
          <input
            placeholder="Barrio"
            value={personaForm.barrio}
            onChange={(e) =>
              setPersonaForm((prev) => ({ ...prev, barrio: e.target.value }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Dirección"
            value={personaForm.direccion}
            onChange={(e) =>
              setPersonaForm((prev) => ({ ...prev, direccion: e.target.value }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          />
          <input
            type="number"
            placeholder="Edad"
            value={personaForm.edad}
            onChange={(e) =>
              setPersonaForm((prev) => ({ ...prev, edad: e.target.value }))
            }
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-black"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-blue-700"
        >
          Registrar asistencia
        </button>
      </form>
    </div>
  );
}
