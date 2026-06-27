'use client';

import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Coins,
  Loader2,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useCasaPazUserStorage } from '@/hooks/useCasaPazUserStorage';
import { apiClient } from '@/lib/api';
import {
  sanitizeCelularInput,
  sanitizeDocumentoInput,
  sanitizeNombreInput,
} from '@/lib/input-security';
import {
  type PublicAttendanceDescriptionLine,
  type PublicAttendanceFlowConfig,
  type PublicAttendanceSummaryFieldConfig,
} from './publicAttendanceConfigs';

type Step = 'LOADING' | 'ASK_DOCUMENT' | 'REGISTER_NEW' | 'RESULTS' | 'ERROR';

type EncuentroChoice = 'encuentrista' | 'acompanante' | '';

interface BaseAttendance {
  id: string;
  nombre: string;
  diaRegistro: string;
  estado: 'ACTIVO' | 'INACTIVO';
  [key: string]: unknown;
}

interface RedOption {
  id: string;
  nombre: string | null;
  sede?: { id: string; nombre: string | null } | null;
}

interface PersonaSummary {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  documento?: string | null;
  fechaNacimiento: string | null;
  red: RedOption | null;
}

interface RegistroResponse {
  alreadyRegistered: boolean;
  esNuevo: boolean;
  needsProfileCompletion: boolean;
  profileCompletion?: {
    needsRed: boolean;
    needsFechaNacimiento: boolean;
  };
  persona: PersonaSummary;
  registroId: string;
  fechaRegistro: string;
}

interface PublicCasaPazSession {
  fecha: string;
  montoOfrenda: number;
  exists: boolean;
}

interface CasaPazAttendance extends BaseAttendance {
  currentSession?: PublicCasaPazSession;
}

interface Props {
  params: Promise<{ token: string }>;
  attendanceLabel: string;
  successMessage: string;
  config: PublicAttendanceFlowConfig;
}

interface RegistrationFormState {
  nombreCompleto: string;
  celular: string;
  encuentro: EncuentroChoice;
}

const EMPTY_REGISTRATION_FORM: RegistrationFormState = {
  nombreCompleto: '',
  celular: '',
  encuentro: '',
};

function buildEndpoint(template: string, token: string): string {
  return template.replace('[token]', encodeURIComponent(token));
}

function getNestedValue(source: unknown, path?: string): unknown {
  if (!path) {
    return source;
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current === 'object' && current !== null && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, source);
}

function getDisplayValue(value: unknown, fallback = '—'): string {
  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function resolveDescriptionLines(
  attendance: BaseAttendance,
  lines: PublicAttendanceDescriptionLine[],
): ReactNode {
  return lines.map((line, index) => {
    const content = line.parts
      .map((part) =>
        part.type === 'text'
          ? part.value
          : getDisplayValue(getNestedValue(attendance, part.value), part.fallback ?? '—'),
      )
      .join('');

    return <p key={`${content}-${index}`}>{content}</p>;
  });
}

function resolveSummaryValue(
  field: PublicAttendanceSummaryFieldConfig,
  attendance: BaseAttendance | null,
  result: RegistroResponse | null,
  documento: string,
  displayName: string,
): string {
  if (field.source === 'computed' && field.computed === 'registrationType') {
    return result?.esNuevo ? 'NUEVA' : 'EXISTENTE';
  }

  const sourceValue =
    field.source === 'attendance'
      ? attendance
      : field.source === 'result'
        ? result
        : field.source === 'documento'
          ? documento
          : displayName;

  return getDisplayValue(getNestedValue(sourceValue, field.path), field.fallback ?? '—');
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
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

function fullName(persona: PersonaSummary | null): string {
  if (!persona) {
    return '';
  }

  return `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || 'Persona sin nombre';
}

function splitNombreCompleto(nombreCompleto: string): { nombres: string; apellidos: string } {
  const parts = nombreCompleto.split(/\s+/).filter(Boolean);
  const nombres = parts[0] || nombreCompleto;
  const apellidos = parts.slice(1).join(' ');

  return { nombres, apellidos };
}

export default function CasaPazAttendanceFlow({
  params,
  attendanceLabel,
  successMessage,
  config,
}: Props) {
  const resolvedParams = use(params);
  const fieldClassName =
    'w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-black disabled:bg-slate-100';
  const primaryButtonClassName =
    'w-full bg-slate-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-60';
  const { people, isLoaded, addPerson, removePerson, findByDocument } = useCasaPazUserStorage();

  const [step, setStep] = useState<Step>('LOADING');
  const [attendance, setAttendance] = useState<BaseAttendance | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [documento, setDocumento] = useState('');
  const [currentResult, setCurrentResult] = useState<RegistroResponse | null>(null);
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>(
    EMPTY_REGISTRATION_FORM,
  );
  const [showOfferingForm, setShowOfferingForm] = useState(false);
  const [offeringAmount, setOfferingAmount] = useState('');
  const [savingOffering, setSavingOffering] = useState(false);
  const [offeringMessage, setOfferingMessage] = useState('');

  const displayName = useMemo(() => fullName(currentResult?.persona || null), [currentResult]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const { data } = await apiClient.get<CasaPazAttendance>(
          buildEndpoint(config.attendanceEndpoint, resolvedParams.token),
        );

        if (cancelled) {
          return;
        }

        setAttendance(data);
        setOfferingAmount(
          data.currentSession?.exists || (data.currentSession?.montoOfrenda ?? 0) > 0
            ? String(data.currentSession?.montoOfrenda ?? 0)
            : '',
        );
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMsg(getErrorMessage(error, 'No se encontró una asistencia válida para este QR.'));
          setStep('ERROR');
        }
      }
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [config.attendanceEndpoint, resolvedParams.token]);

  useEffect(() => {
    if (attendance && isLoaded && step === 'LOADING') {
      const timeoutId = window.setTimeout(() => {
        setStep('ASK_DOCUMENT');
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [attendance, isLoaded, step]);

  const resetToAskDocument = () => {
    setStep('ASK_DOCUMENT');
    setErrorMsg('');
    setDocumento('');
    setCurrentResult(null);
    setRegistrationForm(EMPTY_REGISTRATION_FORM);
  };

  const cacheSuccessfulPerson = (response: RegistroResponse, fallbackDocumento: string) => {
    const personDocumento = response.persona.documento || fallbackDocumento;
    const nombres = response.persona.nombres || '';
    const apellidos = response.persona.apellidos || '';

    if (!response.persona.id || !personDocumento || !nombres) {
      return;
    }

    addPerson({
      id: response.persona.id,
      nombres,
      apellidos,
      documento: personDocumento,
    });
  };

  const handleRegistrationSuccess = (
    response: RegistroResponse,
    submittedDocumento: string,
  ) => {
    const safeDocumento = response.persona.documento || submittedDocumento;

    setDocumento(safeDocumento);
    setCurrentResult({
      ...response,
      persona: {
        ...response.persona,
        documento: safeDocumento,
      },
    });
    cacheSuccessfulPerson(response, submittedDocumento);
    setErrorMsg('');
    setStep('RESULTS');
  };

  const handleDocumentLookup = async (rawDocumento: string) => {
    const safeDocumento = sanitizeDocumentoInput(rawDocumento);

    if (!safeDocumento) {
      setErrorMsg('Documento inválido. Verifica el formato.');
      return;
    }

    setLoadingAction(true);
    setErrorMsg('');

    try {
      const { data } = await apiClient.post<RegistroResponse>(
        buildEndpoint(config.registerEndpoint, resolvedParams.token),
        { documento: safeDocumento },
      );

      handleRegistrationSuccess(data, safeDocumento);
    } catch (error) {
      const status = getErrorStatus(error);

      if (status === 404) {
        setDocumento(safeDocumento);
        setStep('REGISTER_NEW');
      } else {
        console.error(error);
        setErrorMsg(getErrorMessage(error, 'No fue posible registrar la asistencia.'));
        setStep('ERROR');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSubmitDocumento = async (event: React.FormEvent) => {
    event.preventDefault();
    await handleDocumentLookup(documento);
  };

  const handleRegisterSavedPerson = async (rawDocumento: string) => {
    const cachedPerson = findByDocument(rawDocumento);
    const nextDocumento = cachedPerson?.documento || rawDocumento;
    setDocumento(nextDocumento);
    await handleDocumentLookup(nextDocumento);
  };

  const handleRegisterNewPerson = async (event: React.FormEvent) => {
    event.preventDefault();

    const safeDocumento = sanitizeDocumentoInput(documento);
    const nombreCompleto = sanitizeNombreInput(registrationForm.nombreCompleto);
    const celular = sanitizeCelularInput(registrationForm.celular);
    const { nombres, apellidos } = splitNombreCompleto(nombreCompleto);

    if (!safeDocumento) {
      setErrorMsg('Documento inválido. Verifica el formato.');
      return;
    }

    if (!nombreCompleto || !celular) {
      setErrorMsg('Completa nombre, documento y celular.');
      return;
    }

    setLoadingAction(true);
    setErrorMsg('');

    try {
      const { data } = await apiClient.post<RegistroResponse>(
        buildEndpoint(config.registerEndpoint, resolvedParams.token),
        {
          documento: safeDocumento,
          persona: {
            nombreCompleto,
            nombres,
            apellidos,
            celular,
            encuentro:
              registrationForm.encuentro === ''
                ? undefined
                : registrationForm.encuentro === 'encuentrista',
          },
        },
      );

      handleRegistrationSuccess(data, safeDocumento);
    } catch (error) {
      console.error(error);
      setErrorMsg(getErrorMessage(error, 'No fue posible registrar la nueva persona.'));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveOffering = async () => {
    if (!config.offeringEndpoint) {
      return;
    }

    const normalizedValue = offeringAmount.trim() === '' ? 0 : Number(offeringAmount);

    if (Number.isNaN(normalizedValue) || normalizedValue < 0) {
      setOfferingMessage('Ingresa un valor de ofrenda válido que no sea negativo.');
      return;
    }

    setSavingOffering(true);
    setOfferingMessage('');

    try {
      const { data } = await apiClient.put<PublicCasaPazSession>(
        buildEndpoint(config.offeringEndpoint, resolvedParams.token),
        { montoOfrenda: normalizedValue },
      );

      setAttendance((current) =>
        current ? { ...current, currentSession: data } : current,
      );
      setOfferingAmount(String(data.montoOfrenda));
      setOfferingMessage(`Ofrenda guardada para ${data.fecha}.`);
    } catch (error) {
      console.error(error);
      setOfferingMessage(getErrorMessage(error, 'No es posible guardar la ofrenda en este momento.'));
    } finally {
      setSavingOffering(false);
    }
  };

  if (step === 'LOADING' || loadingAction) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-slate-600">Procesando la asistencia de Casa de Paz...</p>
      </div>
    );
  }

  if (step === 'ERROR') {
    return (
      <div className="mx-auto mt-8 w-full max-w-xl space-y-4">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-800">
          <h3 className="text-lg font-semibold mb-2">No fue posible continuar</h3>
          <p>{errorMsg}</p>
        </div>
        <button type="button" onClick={resetToAskDocument} className={primaryButtonClassName}>
          Intentar con otro documento
        </button>
      </div>
    );
  }

  if (step === 'REGISTER_NEW') {
    return (
      <div className="mx-auto mt-8 w-full max-w-xl space-y-4 rounded-xl bg-white p-6 shadow-lg border border-slate-200">
        <BrandLogo variant="horizontal" className="h-12 w-auto object-contain" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-600">
            <UserPlus className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-900">Registrar nueva persona</h2>
          </div>
          <button
            type="button"
            onClick={resetToAskDocument}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Volver
          </button>
        </div>

        <p className="text-sm text-slate-500">
          No encontramos el documento <strong>{documento}</strong>. Completá este registro rápido para
          tomar la asistencia de casa de paz.
        </p>

        <form onSubmit={handleRegisterNewPerson} className="space-y-3">
          <input
            required
            placeholder="Nombre"
            value={registrationForm.nombreCompleto}
            onChange={(e) =>
              setRegistrationForm((prev) => ({
                ...prev,
                nombreCompleto: sanitizeNombreInput(e.target.value),
              }))
            }
            className={fieldClassName}
          />

          <input
            required
            placeholder="Número de documento"
            value={documento}
            onChange={(e) => setDocumento(sanitizeDocumentoInput(e.target.value))}
            maxLength={30}
            className={fieldClassName}
          />

          <input
            required
            placeholder="Celular"
            value={registrationForm.celular}
            onChange={(e) =>
              setRegistrationForm((prev) => ({
                ...prev,
                celular: sanitizeCelularInput(e.target.value),
              }))
            }
            className={fieldClassName}
          />

          <select
            value={registrationForm.encuentro}
            onChange={(e) =>
              setRegistrationForm((prev) => ({
                ...prev,
                encuentro: e.target.value as EncuentroChoice,
              }))
            }
            className={fieldClassName}
          >
            <option value="">Encuentrista o acompañante (opcional)</option>
            <option value="encuentrista">Encuentrista</option>
            <option value="acompanante">Acompañante</option>
          </select>

          {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}

          <button type="submit" className={primaryButtonClassName}>
            Registrar asistencia
          </button>
        </form>
      </div>
    );
  }

  if (step === 'RESULTS' && currentResult) {
    const summaryFields = config.summaryFields.map((field) => ({
      label: field.label,
      value: resolveSummaryValue(field, attendance, currentResult, documento, displayName),
    }));

    return (
      <div className="mx-auto mt-8 w-full max-w-3xl space-y-4">
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-lg border border-slate-200">
          <BrandLogo variant="horizontal" className="h-12 w-auto object-contain" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {currentResult.alreadyRegistered ? 'Ya estaba registrada hoy' : '¡Asistencia registrada!'}
                </h2>
                <p className="text-sm text-slate-500">
                  {currentResult.alreadyRegistered
                    ? 'La asistencia para este documento ya existía en la fecha actual.'
                    : successMessage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetToAskDocument}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Registrar otra persona
            </button>
          </div>

          <div className="space-y-1 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
            {summaryFields.map((field) => (
              <p key={field.label}>
                <span className="font-semibold">{field.label}:</span> {field.value}
              </p>
            ))}
          </div>

          {!currentResult.needsProfileCompletion ? (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              El registro quedó completo para {displayName || 'esta persona'}.
            </div>
          ) : (
            <div className="space-y-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-2 text-amber-900">
                <CircleAlert className="h-4 w-4 mt-0.5" />
                <p className="text-sm">
                  La asistencia ya quedó registrada. Si hace falta completar información, se
                  gestionará por los canales internos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl space-y-4">
      <div className="space-y-5 rounded-xl bg-white p-6 shadow-lg border border-slate-200">
        <BrandLogo variant="horizontal" className="h-12 w-auto object-contain" />
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{attendanceLabel}</h2>
          <div className="mt-1 text-sm text-slate-500">
            {attendance ? resolveDescriptionLines(attendance, config.askDescriptionLines) : null}
          </div>
        </div>

        <form onSubmit={handleSubmitDocumento} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Documento de identidad o extranjería
            </label>
            <input
              type="text"
              required
              value={documento}
              onChange={(e) => setDocumento(sanitizeDocumentoInput(e.target.value))}
              maxLength={30}
              className={fieldClassName}
              placeholder="Ej: 1012345678"
            />
          </div>

          {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}

          <button type="submit" className={primaryButtonClassName}>
            Registrar asistencia
          </button>
        </form>

        {config.offeringEndpoint ? (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowOfferingForm((current) => !current);
                setOfferingMessage('');
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              <Coins className="h-4 w-4" />
              Ofrenda
            </button>

            {showOfferingForm ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="text-sm text-slate-700">
                     <span className="mb-1 block font-medium">Valor de la ofrenda</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={offeringAmount}
                      onChange={(event) => setOfferingAmount(event.target.value)}
                      className={fieldClassName}
                      placeholder="0"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleSaveOffering()}
                    disabled={savingOffering}
                    className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingOffering ? 'Guardando...' : 'Guardar ofrenda'}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Esto guarda la ofrenda para la fecha actual de Casa de Paz.
                </p>

                {offeringMessage ? (
                  <p className="mt-3 text-sm text-slate-600">{offeringMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {people.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Personas guardadas en este dispositivo</h3>
            </div>

            <div className="space-y-3">
              {people.map((person) => (
                <div
                  key={`${person.id}-${person.documento}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {[person.nombres, person.apellidos].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-sm text-slate-500">{person.documento}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleRegisterSavedPerson(person.documento)}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Registrar asistencia
                    </button>
                    <button
                      type="button"
                      onClick={() => removePerson(person.documento)}
                      className="text-slate-400 hover:text-red-600"
                      aria-label={`Eliminar a ${[person.nombres, person.apellidos].filter(Boolean).join(' ')}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
