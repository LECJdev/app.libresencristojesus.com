'use client';

import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useDominicalUserStorage } from '@/hooks/useDominicalUserStorage';
import {
  ColombiaCity,
  ColombiaDepartment,
  fetchColombiaCitiesByDepartment,
  fetchColombiaDepartments,
} from '@/lib/api-colombia';
import {
  sanitizeBarrioInput,
  sanitizeCelularInput,
  sanitizeCorreoInput,
  sanitizeDireccionInput,
  sanitizeDocumentoInput,
  sanitizeEdadInput,
  sanitizeLocationInput,
  sanitizeNombreInput,
} from '@/lib/input-security';
import {
  buildRegistrationPersonaPayload,
  EMPTY_REGISTRATION_PERSONA_FORM,
  RegistrationPersonaForm,
  TipoDocumento,
} from '@/lib/registration-persona';
import {
  type PublicAttendanceDescriptionLine,
  type PublicAttendanceFlowConfig,
  type PublicAttendanceSummaryFieldConfig,
} from './publicAttendanceConfigs';
import BrandLogo from '@/components/BrandLogo';

type Step = 'LOADING' | 'ASK_DOCUMENT' | 'REGISTER_NEW' | 'RESULTS' | 'ERROR';
type MissingProfileField = 'idRed' | 'fechaNacimiento' | 'celular' | 'departamento' | 'ciudad';

interface BaseAttendance {
  id: string;
  nombre: string;
  diaRegistro: string;
  estado: 'ACTIVO' | 'INACTIVO';
  sede?: { id: string; nombre: string | null } | null;
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
  documento: string | null;
  celular: string | null;
  departamento: string | null;
  ciudad: string | null;
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
  missingFields: MissingProfileField[];
}

interface Props {
  params: Promise<{ token: string }>;
  attendanceLabel: string;
  successMessage: string;
  config: PublicAttendanceFlowConfig;
}

interface MissingProfileFormState {
  idRed: string;
  fechaNacimiento: string;
  celular: string;
  departamento: string;
  ciudad: string;
  isSaving: boolean;
  success: string;
  error: string;
}

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

function formatRedLabel(red: RedOption): string {
  if (red.sede?.nombre) {
    return `${red.nombre || red.id} · ${red.sede.nombre}`;
  }

  return red.nombre || red.id;
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

function buildMissingProfileState(persona: PersonaSummary): MissingProfileFormState {
  return {
    idRed: persona.red?.id || '',
    fechaNacimiento: persona.fechaNacimiento || '',
    celular: persona.celular || '',
    departamento: persona.departamento || '',
    ciudad: persona.ciudad || '',
    isSaving: false,
    success: '',
    error: '',
  };
}

function fullName(persona: PersonaSummary | null): string {
  if (!persona) {
    return '';
  }

  return `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || 'Persona sin nombre';
}

export default function DominicalAttendanceFlow({
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
  const { people, isLoaded, addPerson, removePerson, findByDocument } =
    useDominicalUserStorage();

  const [step, setStep] = useState<Step>('LOADING');
  const [attendance, setAttendance] = useState<BaseAttendance | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [documento, setDocumento] = useState('');
  const [currentResult, setCurrentResult] = useState<RegistroResponse | null>(null);
  const [followUpForm, setFollowUpForm] = useState<MissingProfileFormState | null>(null);
  const [personaForm, setPersonaForm] = useState<RegistrationPersonaForm>(
    EMPTY_REGISTRATION_PERSONA_FORM,
  );
  const [departments, setDepartments] = useState<ColombiaDepartment[]>([]);
  const [cities, setCities] = useState<Record<string, ColombiaCity[]>>({});
  const [redes, setRedes] = useState<RedOption[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [locationError, setLocationError] = useState('');

  const displayName = useMemo(() => fullName(currentResult?.persona || null), [currentResult]);
  const selectedDepartment = useMemo(
    () => departments.find((item) => item.name === personaForm.departamento),
    [departments, personaForm.departamento],
  );
  const followUpSelectedDepartment = useMemo(
    () => departments.find((item) => item.name === (followUpForm?.departamento || '')),
    [departments, followUpForm?.departamento],
  );
  const currentCities = selectedDepartment ? cities[String(selectedDepartment.id)] || [] : [];
  const followUpCurrentCities = followUpSelectedDepartment
    ? cities[String(followUpSelectedDepartment.id)] || []
    : [];
  const departmentIdsToLoad = useMemo(
    () =>
      Array.from(
        new Set(
          [selectedDepartment?.id, followUpSelectedDepartment?.id]
            .filter((departmentId): departmentId is number => typeof departmentId === 'number')
            .map((departmentId) => String(departmentId)),
        ),
      ),
    [followUpSelectedDepartment?.id, selectedDepartment?.id],
  );

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const [attendanceResponse, departmentsResponse, redesResponse] = await Promise.all([
          apiClient.get<BaseAttendance>(buildEndpoint(config.attendanceEndpoint, resolvedParams.token)),
          fetchColombiaDepartments(),
          apiClient.get<RedOption[]>('/redes'),
        ]);

        if (cancelled) {
          return;
        }

        setAttendance(attendanceResponse.data);
        setDepartments(departmentsResponse);
        setRedes(redesResponse.data);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMsg(getErrorMessage(error, 'No se encontró una asistencia válida para este QR.'));
          setStep('ERROR');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDepartments(false);
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
      setStep('ASK_DOCUMENT');
    }
  }, [attendance, isLoaded, step]);

  useEffect(() => {
    if (departmentIdsToLoad.length === 0) {
      return;
    }

    const pendingDepartmentIds = departmentIdsToLoad.filter((departmentId) => !cities[departmentId]);

    if (pendingDepartmentIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      setIsLoadingCities(true);
      setLocationError('');

      try {
        const responses = await Promise.all(
          pendingDepartmentIds.map(async (departmentId) => [
            departmentId,
            await fetchColombiaCitiesByDepartment(Number.parseInt(departmentId, 10)),
          ] as const),
        );

        if (!cancelled) {
          setCities((prev) => ({
            ...prev,
            ...Object.fromEntries(responses),
          }));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLocationError('No fue posible cargar ciudades o municipios.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCities(false);
        }
      }
    };

    void loadCities();

    return () => {
      cancelled = true;
    };
  }, [cities, departmentIdsToLoad]);

  const resetToAskDocument = () => {
    setStep('ASK_DOCUMENT');
    setErrorMsg('');
    setDocumento('');
    setCurrentResult(null);
    setFollowUpForm(null);
    setPersonaForm(EMPTY_REGISTRATION_PERSONA_FORM);
    setLocationError('');
  };

  const cacheSuccessfulPerson = (response: RegistroResponse, fallbackDocumento: string) => {
    const personDocumento = response.persona.documento || fallbackDocumento;
    const nombres = response.persona.nombres || '';
    const apellidos = response.persona.apellidos || '';

    if (!response.persona.id || !personDocumento || !nombres || !apellidos) {
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
    setFollowUpForm(
      response.missingFields.length > 0
        ? buildMissingProfileState({
            ...response.persona,
            documento: safeDocumento,
          })
        : null,
    );
    cacheSuccessfulPerson(response, submittedDocumento);
    setErrorMsg('');
    setStep('RESULTS');
  };

  const handleDocumentLookup = async (rawDocumento: string) => {
    const safeDocumento = sanitizeDocumentoInput(rawDocumento);

    if (!safeDocumento) {
      setErrorMsg('Documento inválido. Verificá el formato.');
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
        setPersonaForm((prev) => ({
          ...prev,
          departamento: prev.departamento || '',
          ciudad: prev.ciudad || '',
        }));
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

  const handleCachedPersonClick = async (rawDocumento: string) => {
    const cachedPerson = findByDocument(rawDocumento);
    const nextDocumento = cachedPerson?.documento || rawDocumento;
    setDocumento(nextDocumento);
    await handleDocumentLookup(nextDocumento);
  };

  const handleRegisterNewPerson = async (event: React.FormEvent) => {
    event.preventDefault();

    const safeDocumento = sanitizeDocumentoInput(documento);
    if (!safeDocumento) {
      setErrorMsg('Documento inválido. Verificá el formato.');
      return;
    }

    if (!personaForm.departamento || !personaForm.ciudad) {
      setErrorMsg('Seleccioná departamento y ciudad/municipio.');
      return;
    }

    setLoadingAction(true);
    setErrorMsg('');

    try {
      const { data } = await apiClient.post<RegistroResponse>(
        buildEndpoint(config.registerEndpoint, resolvedParams.token),
        {
          documento: safeDocumento,
          persona: buildRegistrationPersonaPayload(personaForm),
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

  const updateFollowUpField = (
    field: keyof MissingProfileFormState,
    value: string,
  ) => {
    setFollowUpForm((current) =>
      current
        ? {
            ...current,
            [field]: value,
            success: '',
            error: '',
          }
        : current,
    );
  };

  const handleFollowUpDepartmentChange = (value: string) => {
    const nextDepartment = sanitizeLocationInput(value);
    setFollowUpForm((current) =>
      current
        ? {
            ...current,
            departamento: nextDepartment,
            ciudad: '',
            success: '',
            error: '',
          }
        : current,
    );
  };

  const handleUpdateMissingProfile = async () => {
    if (!currentResult?.persona.id || !followUpForm) {
      return;
    }

    if (currentResult.missingFields.includes('idRed') && !followUpForm.idRed) {
      updateFollowUpField('error', 'Seleccioná una red para continuar.');
      return;
    }

    if (
      currentResult.missingFields.includes('fechaNacimiento') &&
      !followUpForm.fechaNacimiento
    ) {
      updateFollowUpField('error', 'Seleccioná una fecha de nacimiento para continuar.');
      return;
    }

    if (currentResult.missingFields.includes('celular') && !followUpForm.celular) {
      updateFollowUpField('error', 'Ingresá un celular para continuar.');
      return;
    }

    if (currentResult.missingFields.includes('departamento') && !followUpForm.departamento) {
      updateFollowUpField('error', 'Seleccioná un departamento para continuar.');
      return;
    }

    if (currentResult.missingFields.includes('ciudad') && !followUpForm.ciudad) {
      updateFollowUpField('error', 'Seleccioná una ciudad para continuar.');
      return;
    }

    setFollowUpForm((current) =>
      current ? { ...current, isSaving: true, error: '', success: '' } : current,
    );

    try {
      const { data } = await apiClient.put<PersonaSummary>(
        buildEndpoint(config.followUpEndpoint, resolvedParams.token),
        {
          personaId: currentResult.persona.id,
          documento: currentResult.persona.documento,
          idRed: currentResult.missingFields.includes('idRed') ? followUpForm.idRed : undefined,
          fechaNacimiento: currentResult.missingFields.includes('fechaNacimiento')
            ? followUpForm.fechaNacimiento
            : undefined,
          celular: currentResult.missingFields.includes('celular') ? followUpForm.celular : undefined,
          departamento: currentResult.missingFields.includes('departamento')
            ? followUpForm.departamento
            : undefined,
          ciudad: currentResult.missingFields.includes('ciudad') ? followUpForm.ciudad : undefined,
        },
      );

      setCurrentResult((current) =>
        current
          ? {
              ...current,
              persona: data,
              missingFields: [],
            }
          : current,
      );
      setFollowUpForm((current) =>
        current
          ? {
              ...current,
              isSaving: false,
              success: 'Datos actualizados correctamente.',
              error: '',
            }
          : current,
      );
    } catch (error) {
      console.error(error);
      setFollowUpForm((current) =>
        current
          ? {
              ...current,
              isSaving: false,
              success: '',
              error: getErrorMessage(error, 'No fue posible actualizar los datos.'),
            }
          : current,
      );
    }
  };

  if (step === 'LOADING' || loadingAction) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-slate-600">Procesando la asistencia dominical...</p>
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
        <button
          type="button"
          onClick={resetToAskDocument}
          className={primaryButtonClassName}
        >
          Intentar con otro documento
        </button>
      </div>
    );
  }

  if (step === 'REGISTER_NEW') {
    return (
      <div className="mx-auto mt-8 w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-lg border border-slate-200">
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
          No encontramos el documento <strong>{documento}</strong>. Completá el registro para
          enlazarlo con la asistencia dominical actual.
        </p>

        <form onSubmit={handleRegisterNewPerson} className="space-y-3">
          <input
            required
            placeholder="Documento"
            value={documento}
            onChange={(e) => setDocumento(sanitizeDocumentoInput(e.target.value))}
            maxLength={30}
            className={fieldClassName}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              placeholder="Nombres"
              value={personaForm.nombres}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  nombres: sanitizeNombreInput(e.target.value),
                }))
              }
              className={fieldClassName}
            />
            <input
              required
              placeholder="Apellidos"
              value={personaForm.apellidos}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  apellidos: sanitizeNombreInput(e.target.value),
                }))
              }
              className={fieldClassName}
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
                  celular: sanitizeCelularInput(e.target.value),
                }))
              }
              className={fieldClassName}
            />
            <select
              value={personaForm.tipoDocumento}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  tipoDocumento: e.target.value as TipoDocumento,
                }))
              }
              className={fieldClassName}
            >
              <option value="C.C">C.C</option>
              <option value="T.I.">T.I.</option>
              <option value="PT">PT</option>
              <option value="C.E.">C.E.</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              required
              value={personaForm.departamento}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  departamento: sanitizeLocationInput(e.target.value),
                  ciudad: '',
                }))
              }
              disabled={isLoadingDepartments}
              className={fieldClassName}
            >
              <option value="">{isLoadingDepartments ? 'Cargando departamentos...' : 'Departamento'}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
            <select
              required
              value={personaForm.ciudad}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  ciudad: sanitizeLocationInput(e.target.value),
                }))
              }
              disabled={!personaForm.departamento || isLoadingCities}
              className={fieldClassName}
            >
              <option value="">{isLoadingCities ? 'Cargando ciudades...' : 'Ciudad / Municipio'}</option>
              {currentCities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={personaForm.idRed}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  idRed: e.target.value,
                }))
              }
              className={fieldClassName}
            >
              <option value="">Red (opcional)</option>
              {redes.map((red) => (
                <option key={red.id} value={red.id}>
                  {formatRedLabel(red)}
                </option>
              ))}
            </select>
            <input
              placeholder="Correo"
              value={personaForm.correo}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  correo: sanitizeCorreoInput(e.target.value),
                }))
              }
              className={fieldClassName}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Barrio (opcional)"
              value={personaForm.barrio}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  barrio: sanitizeBarrioInput(e.target.value),
                }))
              }
              className={fieldClassName}
            />
            <input
              placeholder="Dirección"
              value={personaForm.direccion}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  direccion: sanitizeDireccionInput(e.target.value),
                }))
              }
              className={fieldClassName}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Edad"
              value={personaForm.edad}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  edad: sanitizeEdadInput(e.target.value),
                }))
              }
              className={fieldClassName}
            />
            <input
              type="date"
              value={personaForm.fechaNacimiento}
              onChange={(e) =>
                setPersonaForm((prev) => ({
                  ...prev,
                  fechaNacimiento: e.target.value,
                }))
              }
              className={fieldClassName}
            />
          </div>

          {locationError ? <p className="text-sm text-amber-600">{locationError}</p> : null}
          {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}

          <button
            type="submit"
            className={primaryButtonClassName}
          >
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

          {currentResult.missingFields.length === 0 ? (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              El registro quedó completo para {displayName || 'esta persona'}.
            </div>
          ) : (
            <div className="space-y-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-2 text-amber-900">
                <CircleAlert className="h-4 w-4 mt-0.5" />
                <p className="text-sm">
                  La asistencia ya quedó registrada. Completá los datos faltantes de esta persona.
                </p>
              </div>

              {currentResult.missingFields.includes('idRed') ? (
                <select
                  value={followUpForm?.idRed || ''}
                  onChange={(e) => updateFollowUpField('idRed', e.target.value)}
                  className={fieldClassName}
                >
                  <option value="">Seleccioná una red</option>
                  {redes.map((red) => (
                    <option key={red.id} value={red.id}>
                      {formatRedLabel(red)}
                    </option>
                  ))}
                </select>
              ) : null}

              {currentResult.missingFields.includes('fechaNacimiento') ? (
                <input
                  type="date"
                  value={followUpForm?.fechaNacimiento || ''}
                  onChange={(e) => updateFollowUpField('fechaNacimiento', e.target.value)}
                  className={fieldClassName}
                />
              ) : null}

              {currentResult.missingFields.includes('celular') ? (
                <input
                  type="text"
                  placeholder="Celular"
                  value={followUpForm?.celular || ''}
                  onChange={(e) => updateFollowUpField('celular', sanitizeCelularInput(e.target.value))}
                  className={fieldClassName}
                />
              ) : null}

              {currentResult.missingFields.includes('departamento') ? (
                <select
                  value={followUpForm?.departamento || ''}
                  onChange={(e) => handleFollowUpDepartmentChange(e.target.value)}
                  disabled={isLoadingDepartments}
                  className={fieldClassName}
                >
                  <option value="">
                    {isLoadingDepartments ? 'Cargando departamentos...' : 'Seleccioná un departamento'}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
              ) : null}

              {currentResult.missingFields.includes('ciudad') ? (
                <select
                  value={followUpForm?.ciudad || ''}
                  onChange={(e) =>
                    updateFollowUpField('ciudad', sanitizeLocationInput(e.target.value))
                  }
                  disabled={!followUpForm?.departamento || isLoadingCities}
                  className={fieldClassName}
                >
                  <option value="">
                    {!followUpForm?.departamento
                      ? 'Primero seleccioná un departamento'
                      : isLoadingCities
                        ? 'Cargando ciudades...'
                        : 'Seleccioná una ciudad o municipio'}
                  </option>
                  {followUpCurrentCities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              ) : null}

              {locationError ? <p className="text-sm text-amber-600">{locationError}</p> : null}

              {followUpForm?.error ? <p className="text-sm text-red-600">{followUpForm.error}</p> : null}
              {followUpForm?.success ? <p className="text-sm text-green-700">{followUpForm.success}</p> : null}

              <button
                type="button"
                onClick={() => void handleUpdateMissingProfile()}
                disabled={followUpForm?.isSaving}
                className={primaryButtonClassName}
              >
                {followUpForm?.isSaving ? 'Guardando...' : 'Actualizar datos'}
              </button>
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
            {attendance
              ? resolveDescriptionLines(attendance, config.askDescriptionLines)
              : null}
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

          <button
            type="submit"
            className={primaryButtonClassName}
          >
            Continuar
          </button>
        </form>

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
                  <button
                    type="button"
                    onClick={() => void handleCachedPersonClick(person.documento)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium text-slate-900">
                      {person.nombres} {person.apellidos}
                    </p>
                    <p className="text-sm text-slate-500">{person.documento}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removePerson(person.documento)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label={`Eliminar a ${person.nombres} ${person.apellidos}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
