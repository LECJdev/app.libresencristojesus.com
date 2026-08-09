'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { CasaPazReportPanel } from '@/components/casa-paz/casa-paz-report-panel';
import QrPdfDownload from '@/components/QrPdfDownload';
import TableScrollHint from '@/components/TableScrollHint';
import { useAuth } from '@/hooks/useAuth';
import {
  buildPersonaName,
  getCurrentMonthValue,
  type CasaPazReportResponse,
  type PersonaOption,
} from '@/lib/casa-paz-reports';
import {
  buildCasaPazReportExportParams,
  downloadCasaPazReport,
  type CasaPazReportExportResponse,
} from '@/lib/casa-paz-report-export';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  Trash2,
  Save,
  X,
  Home,
} from 'lucide-react';

const SESSION_ERROR_MESSAGE =
  'Tu sesión expiró o no es válida. Inicia sesión nuevamente para continuar.';

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem('LC_AUTH_TOKEN')?.trim() ?? '';
}

type EstadoAsistenciaCasaPaz = 'ACTIVO' | 'INACTIVO';
type DiaPredica =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

interface Red {
  id: string;
  nombre: string | null;
}

interface AsistenciaCasaPaz {
  id: string;
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaCasaPaz;
  qrToken: string;
  idRed: string;
  direccionCasa: string;
  red: Red;
  idPersonaACargo: string | null;
  idAnfitrion: string | null;
  idLiderPrincipal: string | null;
  personaACargo: PersonaOption | null;
  anfitrion: PersonaOption | null;
  liderPrincipal: PersonaOption | null;
}

interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DIAS: DiaPredica[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
];

const ESTADOS: EstadoAsistenciaCasaPaz[] = ['ACTIVO', 'INACTIVO'];

interface SearchablePersonaSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: PersonaOption[];
  selectedOption: PersonaOption | null;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  lockedMessage?: string;
}

function buildPersonaSearchText(persona: PersonaOption) {
  return `${buildPersonaName(persona)} ${persona.id}`.toLowerCase();
}

function SearchablePersonaSelect({
  label,
  value,
  onChange,
  options,
  selectedOption,
  disabled = false,
  required = false,
  placeholder = 'Escribe para buscar una persona',
  lockedMessage,
}: SearchablePersonaSelectProps) {
  const [query, setQuery] = useState(() => (selectedOption ? buildPersonaName(selectedOption) : ''));
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fieldId = useMemo(
    () => `persona-select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    [label],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = query.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((persona) =>
      buildPersonaSearchText(persona).includes(normalizedSearch),
    );
  }, [options, query]);

  const handleSelect = (personaId: string) => {
    onChange(personaId);
    const nextSelected = options.find((persona) => persona.id === personaId) ?? null;
    setQuery(nextSelected ? buildPersonaName(nextSelected) : '');
    setIsOpen(false);
  };

  const handleInputChange = (nextValue: string) => {
    setQuery(nextValue);
    setIsOpen(true);

    if (value) {
      onChange('');
    }
  };

  const showEmptyState = !disabled && filteredOptions.length === 0;
  const canClear = !disabled && !required && Boolean(value || query);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => !disabled && setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery(selectedOption ? buildPersonaName(selectedOption) : '');
              }

              if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
                e.preventDefault();
                handleSelect(filteredOptions[0].id);
              }
            }}
            disabled={disabled}
            placeholder={disabled && selectedOption ? buildPersonaName(selectedOption) : placeholder}
            className="w-full border border-slate-300 rounded-md px-3 py-2 pr-10 text-sm text-slate-900 bg-white disabled:bg-slate-100 disabled:text-slate-500"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={`${fieldId}-options`}
            aria-required={required}
          />
          {canClear ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setQuery('');
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-1 inline-flex w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              aria-label={`Limpiar ${label}`}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {isOpen && !disabled ? (
          <div
            id={`${fieldId}-options`}
            role="listbox"
            className="max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm"
          >
            {!required ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect('')}
                className="min-h-11 w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                Sin selección
              </button>
            ) : null}
            {filteredOptions.map((persona) => {
              const isSelected = persona.id === value;

              return (
                <button
                  key={persona.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(persona.id)}
                  className={`min-h-11 w-full break-words px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    isSelected ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700'
                  }`}
                >
                  {buildPersonaName(persona)}
                </button>
              );
            })}
          </div>
        ) : null}
        {disabled && lockedMessage ? (
          <p className="text-xs text-slate-500">{lockedMessage}</p>
        ) : showEmptyState ? (
          <p className="text-xs text-slate-500">No hay personas que coincidan con la búsqueda actual.</p>
        ) : (
          <p className="text-xs text-slate-500">
            {filteredOptions.length} persona{filteredOptions.length === 1 ? '' : 's'} disponible{filteredOptions.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AsistenciasCasaPazPage() {
  const router = useRouter();
  const {
    canDeleteData,
    isScopedCasaDePazLeader,
    loading: authLoading,
    logout,
    user,
  } = useAuth();

  const currentLeaderOption = useMemo<PersonaOption | null>(
    () =>
      user
        ? {
            id: user.id,
            nombres: user.nombres,
            apellidos: user.apellidos,
          }
        : null,
    [user],
  );

  const [items, setItems] = useState<AsistenciaCasaPaz[]>([]);
  const [redes, setRedes] = useState<Red[]>([]);
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFormOptions, setLoadingFormOptions] = useState(true);
  const [redesError, setRedesError] = useState<string | null>(null);
  const [personasError, setPersonasError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [summaryReport, setSummaryReport] = useState<CasaPazReportResponse | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<CasaPazReportResponse | null>(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthValue());
  const [exportingReport, setExportingReport] = useState(false);
  const dataRequestIdRef = useRef(0);
  const formOptionsRequestIdRef = useRef(0);
  const reportRequestIdRef = useRef(0);
  const exportRequestIdRef = useRef(0);
  const sessionInvalidatedRef = useRef(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AsistenciaCasaPaz | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    diaRegistro: 'DOMINGO' as DiaPredica,
    estado: 'ACTIVO' as EstadoAsistenciaCasaPaz,
    idRed: '',
    direccionCasa: '',
    idPersonaACargo: '',
    idAnfitrion: '',
    idLiderPrincipal: '',
  });

  const invalidateSession = () => {
    if (sessionInvalidatedRef.current) {
      return;
    }

    sessionInvalidatedRef.current = true;
    dataRequestIdRef.current += 1;
    formOptionsRequestIdRef.current += 1;
    reportRequestIdRef.current += 1;
    exportRequestIdRef.current += 1;
    setSessionError(SESSION_ERROR_MESSAGE);
    logout();
  };

  const requireAuthenticatedSession = () => {
    if (authLoading || sessionInvalidatedRef.current) {
      return false;
    }

    if (!user || !getStoredAuthToken()) {
      invalidateSession();
      return false;
    }

    return true;
  };

  const fetchData = async (
    nextPage: number = page,
    nextSearch: string = search,
  ) => {
    if (!requireAuthenticatedSession()) {
      return;
    }

    const requestId = ++dataRequestIdRef.current;
    setLoading(true);
    try {
      const { data: asistencias } = await apiClient.get<PagedResponse<AsistenciaCasaPaz>>(
        '/asistencias-casa-paz',
        {
          params: { search: nextSearch, page: nextPage, limit },
        },
      );

      if (requestId !== dataRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setItems(asistencias.data);
      setTotalPages(asistencias.totalPages || 1);
    } catch (error) {
      if (requestId !== dataRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      console.error(error);

      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      alert('Error cargando asistencias de casa de paz');
    } finally {
      if (requestId === dataRequestIdRef.current && !sessionInvalidatedRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchFormOptions = async () => {
    if (authLoading || sessionInvalidatedRef.current) {
      return;
    }

    const requestId = ++formOptionsRequestIdRef.current;
    setLoadingFormOptions(true);

    try {
      const redesRequest = apiClient.get<Red[]>('/redes');

      if (!user || !getStoredAuthToken()) {
        const [redesResult] = await Promise.allSettled([redesRequest]);

        if (requestId !== formOptionsRequestIdRef.current || sessionInvalidatedRef.current) {
          return;
        }

        if (redesResult.status === 'fulfilled') {
          setRedes(redesResult.value.data);
          setRedesError(null);
        } else {
          console.error(redesResult.reason);
          setRedes([]);
          setRedesError('No se pudieron cargar las redes. Recarga la página e inténtalo nuevamente.');
        }

        invalidateSession();
        return;
      }

      const [redesResult, personasResult] = await Promise.allSettled([
        redesRequest,
        apiClient.get<PersonaOption[]>('/asistencias-casa-paz/person-options'),
      ]);

      if (requestId !== formOptionsRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      if (redesResult.status === 'fulfilled') {
        setRedes(redesResult.value.data);
        setRedesError(null);
      } else {
        console.error(redesResult.reason);
        setRedes([]);
        setRedesError('No se pudieron cargar las redes. Recarga la página e inténtalo nuevamente.');
      }

      if (personasResult.status === 'fulfilled') {
        setPersonas(personasResult.value.data);
        setPersonasError(null);
      } else {
        console.error(personasResult.reason);

        if (isUnauthorizedError(personasResult.reason)) {
          invalidateSession();
          return;
        }

        setPersonas([]);
        setPersonasError(
          'No se pudieron cargar las personas responsables. Recarga la página e inténtalo nuevamente.',
        );
      }
    } finally {
      if (requestId === formOptionsRequestIdRef.current && !sessionInvalidatedRef.current) {
        setLoadingFormOptions(false);
      }
    }
  };

  const invalidateReportState = () => {
    const requestId = ++reportRequestIdRef.current;
    exportRequestIdRef.current += 1;
    setSummaryReport(null);
    setMonthlyReport(null);
    setLoadingReports(true);
    setExportingReport(false);
    return requestId;
  };

  const fetchReports = async (month: string = reportMonth) => {
    if (!requireAuthenticatedSession()) {
      return;
    }

    const requestId = invalidateReportState();
    try {
      const [{ data: summary }, { data: monthly }] = await Promise.all([
        apiClient.get<CasaPazReportResponse>('/asistencias-casa-paz/reportes/resumen-general'),
        apiClient.get<CasaPazReportResponse>('/asistencias-casa-paz/reportes/mensual', {
          params: { month },
        }),
      ]);

      if (requestId !== reportRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      setSummaryReport(summary);
      setMonthlyReport(monthly);
    } catch (error) {
      if (requestId !== reportRequestIdRef.current || sessionInvalidatedRef.current) {
        return;
      }

      console.error(error);

      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      alert('Error al cargar los reportes de Casa de Paz');
    } finally {
      if (
        requestId === reportRequestIdRef.current &&
        !sessionInvalidatedRef.current
      ) {
        setLoadingReports(false);
      }
    }
  };

  const handleExportReport = async (report: CasaPazReportResponse | null) => {
    if (!report || !requireAuthenticatedSession()) {
      return;
    }

    const reportRequestId = reportRequestIdRef.current;
    const exportRequestId = ++exportRequestIdRef.current;
    setExportingReport(true);
    try {
      const { data } = await apiClient.get<CasaPazReportExportResponse>(
        '/asistencias-casa-paz/reportes/export-rows',
        {
          params: buildCasaPazReportExportParams(report),
        },
      );

      if (
        reportRequestId !== reportRequestIdRef.current ||
        exportRequestId !== exportRequestIdRef.current
      ) {
        return;
      }

      downloadCasaPazReport(data);
    } catch (error) {
      if (
        reportRequestId !== reportRequestIdRef.current ||
        exportRequestId !== exportRequestIdRef.current
      ) {
        return;
      }

      console.error(error);

      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      alert('Error al exportar el reporte de Casa de Paz');
    } finally {
      if (
        exportRequestId === exportRequestIdRef.current &&
        !sessionInvalidatedRef.current
      ) {
        setExportingReport(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchData(page, search);
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, page, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchFormOptions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchReports(reportMonth);
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, reportMonth, user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await fetchData(1, search);
  };

  const openCreate = () => {
    if (loadingFormOptions) {
      return;
    }

    setEditing(null);
    setForm({
      nombre: '',
      diaRegistro: 'DOMINGO',
      estado: 'ACTIVO',
      idRed: redes[0]?.id || '',
      direccionCasa: '',
      idPersonaACargo: '',
      idAnfitrion: '',
      idLiderPrincipal: isScopedCasaDePazLeader && currentLeaderOption ? currentLeaderOption.id : '',
    });
    setShowForm(true);
  };

  const openEdit = (item: AsistenciaCasaPaz) => {
    if (!confirm('¿Querés editar esta asistencia de casa de paz?')) return;

    setEditing(item);
    setForm({
      nombre: item.nombre,
      diaRegistro: item.diaRegistro,
      estado: item.estado,
      idRed: item.idRed,
      direccionCasa: item.direccionCasa,
      idPersonaACargo: item.idPersonaACargo || '',
      idAnfitrion: item.idAnfitrion || '',
      idLiderPrincipal:
        isScopedCasaDePazLeader && currentLeaderOption
          ? currentLeaderOption.id
          : item.idLiderPrincipal || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    if (!form.idRed) {
      alert('Debes seleccionar una red');
      return;
    }

    if (!form.direccionCasa.trim()) {
      alert('Debes ingresar la dirección de la casa');
      return;
    }

    if (!(isScopedCasaDePazLeader && currentLeaderOption) && !form.idLiderPrincipal) {
      alert('Debes seleccionar un líder principal');
      return;
    }

    const payload = {
      nombre: form.nombre,
      diaRegistro: form.diaRegistro,
      estado: form.estado,
      idRed: form.idRed,
      direccionCasa: form.direccionCasa,
      idPersonaACargo: form.idPersonaACargo || null,
      idAnfitrion: form.idAnfitrion || null,
      idLiderPrincipal:
        isScopedCasaDePazLeader && currentLeaderOption
          ? currentLeaderOption.id
          : form.idLiderPrincipal || null,
    };

    if (!requireAuthenticatedSession()) {
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.put(`/asistencias-casa-paz/${editing.id}`, payload);
      } else {
        await apiClient.post('/asistencias-casa-paz', payload);
      }

      closeForm();
      await fetchData();
    } catch (error) {
      console.error(error);

      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      alert('Error guardando la asistencia de casa de paz');
    } finally {
      if (!sessionInvalidatedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleToggleEstado = async (item: AsistenciaCasaPaz) => {
    const nextEstado: EstadoAsistenciaCasaPaz =
      item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    if (!confirm(`¿Confirmas cambiar el estado a ${nextEstado}?`)) return;
    if (!requireAuthenticatedSession()) return;

    try {
      await apiClient.patch(`/asistencias-casa-paz/${item.id}/estado`, {
        estado: nextEstado,
      });
      await fetchData();
    } catch (error) {
      console.error(error);

      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      alert('Error cambiando estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteData) return;
    if (!confirm('¿Seguro de eliminar esta asistencia de casa de paz?')) return;
    if (!requireAuthenticatedSession()) return;

    try {
      await apiClient.delete(`/asistencias-casa-paz/${id}`);
      await fetchData();
    } catch (error) {
      console.error(error);

      if (isUnauthorizedError(error)) {
        invalidateSession();
        return;
      }

      alert('Error eliminando asistencia');
    }
  };

  const goToDetail = (id: string) => {
    if (!confirm('¿Ir al detalle de esta asistencia?')) return;
    router.push(`/admin/asistencias/casa-paz/${id}`);
  };

  const personasById = useMemo(
    () => new Map(personas.map((persona) => [persona.id, persona] as const)),
    [personas],
  );

  const selectedPersonInCharge = personasById.get(form.idPersonaACargo) ?? null;
  const selectedHost = personasById.get(form.idAnfitrion) ?? null;
  const selectedLeader = personasById.get(form.idLiderPrincipal) ?? currentLeaderOption ?? null;

  const selectablePersonas = useMemo(() => {
    const byId = new Map(personas.map((persona) => [persona.id, persona] as const));

    [selectedPersonInCharge, selectedHost, selectedLeader, currentLeaderOption]
      .filter((persona): persona is PersonaOption => Boolean(persona))
      .forEach((persona) => {
        byId.set(persona.id, persona);
      });

    return Array.from(byId.values()).sort((left, right) =>
      buildPersonaName(left).localeCompare(buildPersonaName(right)),
    );
  }, [currentLeaderOption, personas, selectedHost, selectedLeader, selectedPersonInCharge]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Casa de Paz
          </h1>
          <p className="text-slate-500 text-sm">
            Administra las Casas de Paz, sus responsables y los reportes según el alcance disponible.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loadingFormOptions}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {loadingFormOptions ? 'Cargando opciones...' : 'Nueva Asistencia'}
        </button>
      </div>

      {sessionError ? (
        <div role="alert" className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {sessionError}
        </div>
      ) : null}

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ventana de reportes</h2>
            <p className="text-sm text-slate-500">
              Revisa el resumen actual según tu alcance y la tendencia mensual de asistencia.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-medium">Mes</span>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => {
                  invalidateReportState();
                  setReportMonth(e.target.value);
                }}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </div>

        <CasaPazReportPanel
          title="Resumen del alcance"
          description="Todas las Casas de Paz disponibles dentro del alcance actual de la cuenta."
          report={summaryReport}
          loading={loadingReports}
          candidateLimit={5}
        />

        <CasaPazReportPanel
          title="Reporte mensual de asistencia"
          description={`Asistencia, sesiones y seguimiento de encuentros para ${reportMonth}.`}
          report={monthlyReport}
          loading={loadingReports}
          candidateLimit={5}
          onExport={() => void handleExportReport(monthlyReport)}
          exporting={exportingReport}
        />
      </div>

      <form onSubmit={handleSearch} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, red o dirección"
            className="w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 bg-white"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          Buscar
        </button>
      </form>

      <TableScrollHint />
      <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Red</th>
              <th className="px-6 py-4 font-semibold">Dirección</th>
              <th className="px-6 py-4 font-semibold">Día</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">QR</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                  Cargando asistencias...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                  No hay asistencias de casa de paz registradas.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.nombre}</td>
                  <td className="px-6 py-4 text-slate-700">{item.red?.nombre || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{item.direccionCasa}</td>
                  <td className="px-6 py-4 text-slate-700">{item.diaRegistro}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        item.estado === 'ACTIVO'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    <QrPdfDownload
                      publicPath={`/asistencia/casa-paz/${item.qrToken}`}
                      fileName={`qr-casa-paz-${item.nombre}`}
                      title={item.nombre}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => goToDetail(item.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-blue-600 md:min-h-9 md:min-w-9"
                        title="Detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-orange-600 md:min-h-9 md:min-w-9"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleEstado(item)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-purple-600 md:min-h-9 md:min-w-9"
                        title="Activar / Desactivar"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      {canDeleteData && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:text-red-600 md:min-h-9 md:min-w-9"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-end">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-slate-600">
          Página {page} de {Math.max(totalPages, 1)}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 p-3 sm:items-center sm:p-4">
          <form
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="casa-paz-form-title"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg sm:max-h-[calc(100dvh-2rem)]"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <h2 id="casa-paz-form-title" className="min-w-0 break-words text-lg font-semibold text-slate-900">
                {editing ? 'Editar Asistencia Casa de Paz' : 'Nueva Asistencia Casa de Paz'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                aria-label="Cerrar formulario"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {redesError ? (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {redesError}
                </p>
              ) : redes.length === 0 ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No hay redes disponibles para seleccionar. Debes crear una red antes de guardar esta asistencia.
                </p>
              ) : null}

              {personasError ? (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {personasError}
                </p>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Red *</label>
                <select
                  required
                  value={form.idRed}
                  onChange={(e) => setForm((prev) => ({ ...prev, idRed: e.target.value }))}
                  disabled={Boolean(redesError)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                >
                  <option value="">Selecciona una red</option>
                  {redes.map((red) => (
                    <option key={red.id} value={red.id}>
                      {red.nombre || red.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dirección de la casa *
                </label>
                <input
                  type="text"
                  required
                  value={form.direccionCasa}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, direccionCasa: e.target.value }))
                  }
                  placeholder="Ej: Cra 12 #45-67 Barrio Centro"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Día de registro *</label>
                  <select
                    required
                    value={form.diaRegistro}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        diaRegistro: e.target.value as DiaPredica,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                  >
                    {DIAS.map((dia) => (
                      <option key={dia} value={dia}>
                        {dia}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                  <select
                    required
                    value={form.estado}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        estado: e.target.value as EstadoAsistenciaCasaPaz,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <SearchablePersonaSelect
                    label="Persona a cargo"
                    value={form.idPersonaACargo}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, idPersonaACargo: value }))
                    }
                    options={selectablePersonas}
                    selectedOption={selectedPersonInCharge}
                    disabled={Boolean(personasError)}
                     placeholder="Escribe para buscar la persona a cargo"
                  />
                </div>

                <div>
                  <SearchablePersonaSelect
                    label="Anfitrión"
                    value={form.idAnfitrion}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, idAnfitrion: value }))
                    }
                    options={selectablePersonas}
                    selectedOption={selectedHost}
                    disabled={Boolean(personasError)}
                     placeholder="Escribe para buscar el anfitrión"
                  />
                </div>

                <div>
                  <SearchablePersonaSelect
                    label="Líder principal"
                    value={form.idLiderPrincipal}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, idLiderPrincipal: value }))
                    }
                    options={selectablePersonas}
                    selectedOption={selectedLeader}
                    disabled={isScopedCasaDePazLeader || Boolean(personasError)}
                    required
                     placeholder="Escribe para buscar el líder principal"
                    lockedMessage={
                      isScopedCasaDePazLeader
                        ? `Bloqueado para ${buildPersonaName(selectedLeader || currentLeaderOption)}`
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeForm}
                className="min-h-11 w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-6 border border-dashed border-slate-300 rounded-lg p-5 text-sm text-slate-500 flex items-center gap-2">
          <Home className="h-4 w-4" /> Crea tu primera asistencia para Casa de Paz.
        </div>
      )}
    </div>
  );
}
