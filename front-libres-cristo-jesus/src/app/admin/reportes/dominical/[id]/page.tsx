'use client';

import { use, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, Filter, RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  getDominicalMonthRange,
  type DominicalPersonDetailResponse,
  type DominicalReportPerson,
  type DominicalReportResponse,
} from '@/lib/dominical-report';
import { DominicalReportCharts } from '@/components/attendance/dominical-report-charts';
import { DominicalReportMatrix } from '@/components/attendance/dominical-report-matrix';
import { DominicalPersonDetailModal } from '@/components/attendance/dominical-person-detail-modal';

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem('LC_AUTH_TOKEN')?.trim() ?? '';
}

function normalizeAttendanceDates(values: string[]): string[] {
  return [...new Set(values.map((value) => value.slice(0, 10)))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export default function DominicalReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { loading: authLoading, user, logout } = useAuth();
  const [report, setReport] = useState<DominicalReportResponse | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [monthFrom, setMonthFrom] = useState('');
  const [monthTo, setMonthTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<DominicalReportPerson | null>(null);
  const [personDetail, setPersonDetail] = useState<DominicalPersonDetailResponse | null>(null);
  const [personDetailLoading, setPersonDetailLoading] = useState(false);
  const [personDetailError, setPersonDetailError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const requestId = ++requestIdRef.current;
    if (!user || !getStoredAuthToken()) {
      return;
    }

    const loadInitialReport = async () => {
      try {
        const [{ data: reportData }, { data: datesData }] = await Promise.all([
          apiClient.get<DominicalReportResponse>(
            `/asistencias-dominicales/${resolvedParams.id}/reportes`,
          ),
          apiClient.get<string[]>(
            `/asistencias-dominicales/${resolvedParams.id}/registros/fechas`,
          ),
        ]);

        if (requestId !== requestIdRef.current) {
          return;
        }

        const dates = normalizeAttendanceDates(datesData);
        const range = getDominicalMonthRange(dates);
        setReport(reportData);
        setAvailableDates(dates);
        setMonthFrom(range?.monthFrom ?? reportData.filters.monthFrom ?? '');
        setMonthTo(range?.monthTo ?? reportData.filters.monthTo ?? '');
      } catch (requestError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error(requestError);
        if (isUnauthorizedError(requestError)) {
          setError('Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar el reporte.');
          logout();
          return;
        }

        setError('No se pudo cargar el reporte Dominical.');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void loadInitialReport();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, resolvedParams.id, user]);

  const loadFilteredReport = async (
    nextMonthFrom: string,
    nextMonthTo: string,
  ) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (nextMonthFrom) {
        params.monthFrom = nextMonthFrom;
      }
      if (nextMonthTo) {
        params.monthTo = nextMonthTo;
      }

      const { data } = await apiClient.get<DominicalReportResponse>(
        `/asistencias-dominicales/${resolvedParams.id}/reportes`,
        { params },
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      setReport(data);
      setMonthFrom(nextMonthFrom);
      setMonthTo(nextMonthTo);
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(requestError);
      if (isUnauthorizedError(requestError)) {
        setError('Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar el reporte.');
        logout();
        return;
      }

      setError('No se pudo aplicar el rango seleccionado.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleApplyFilters = (event: React.FormEvent) => {
    event.preventDefault();

    if (monthFrom && monthTo && monthFrom > monthTo) {
      setError('El mes desde no puede ser posterior al mes hasta.');
      return;
    }

    void loadFilteredReport(monthFrom, monthTo);
  };

  const handleShowAll = () => {
    const range = getDominicalMonthRange(availableDates);
    void loadFilteredReport(range?.monthFrom ?? '', range?.monthTo ?? '');
  };

  const handlePersonDetail = async (personId: string) => {
    const person = report?.people.find((item) => item.id === personId) ?? null;
    setSelectedPerson(person);
    setPersonDetail(null);
    setPersonDetailError(null);
    setPersonDetailLoading(true);

    try {
      const { data } = await apiClient.get<DominicalPersonDetailResponse>(
        `/asistencias-dominicales/${resolvedParams.id}/reportes/personas/${personId}`,
      );
      setPersonDetail(data);
    } catch (requestError) {
      console.error(requestError);
      if (isUnauthorizedError(requestError)) {
        setPersonDetailError('Tu sesión expiró o no es válida.');
        logout();
      } else {
        setPersonDetailError('No se pudo cargar el detalle seguro de la persona.');
      }
    } finally {
      setPersonDetailLoading(false);
    }
  };

  const closePersonDetail = () => {
    setSelectedPerson(null);
    setPersonDetail(null);
    setPersonDetailError(null);
  };

  const availableRange = getDominicalMonthRange(availableDates);
  const sessionUnavailable = !authLoading && (!user || !getStoredAuthToken());

  if (loading && !report && !sessionUnavailable) {
    return <div className="p-4 text-center text-slate-500 sm:p-6 lg:p-8">Cargando reporte Dominical...</div>;
  }

  if ((error || sessionUnavailable) && !report) {
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <Link href="/admin/reportes" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Volver a reportes
        </Link>
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
          {error || 'Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar el reporte.'}
        </p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/admin/reportes"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:text-slate-700"
          aria-label="Volver a reportes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Reporte Dominical</p>
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">{report.asistencia.nombre}</h1>
          <p className="break-words text-sm text-slate-500">
            Sede: {report.asistencia.sede?.nombre || 'Sin sede'} · Día: {report.asistencia.diaRegistro} · Estado: {report.asistencia.estado}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Rango de meses</h2>
            <p className="mt-1 text-xs text-slate-500">
              El rango es inclusivo y controla las fechas, filas y gráficos mostrados.
            </p>
          </div>
        </div>
        <form onSubmit={handleApplyFilters} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block font-medium">Mes desde</span>
            <input
              type="month"
              value={monthFrom}
              min={availableRange?.monthFrom}
              max={availableRange?.monthTo}
              onChange={(event) => setMonthFrom(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block font-medium">Mes hasta</span>
            <input
              type="month"
              value={monthTo}
              min={availableRange?.monthFrom}
              max={availableRange?.monthTo}
              onChange={(event) => setMonthTo(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <button type="submit" className="min-h-11 self-end rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60" disabled={loading}>
            Aplicar filtros
          </button>
          <button type="button" onClick={handleShowAll} className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" disabled={loading}>
            <RotateCcw className="h-4 w-4" /> Todo el histórico
          </button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <DominicalReportCharts report={report} loading={loading} error={null} />
      <DominicalReportMatrix report={report} loading={loading} onPersonDetail={(personId) => void handlePersonDetail(personId)} />

      <DominicalPersonDetailModal
        selectedPerson={selectedPerson}
        detail={personDetail}
        loading={personDetailLoading}
        error={personDetailError}
        onClose={closePersonDetail}
      />
    </div>
  );
}
