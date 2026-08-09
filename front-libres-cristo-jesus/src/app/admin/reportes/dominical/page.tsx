'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { DominicalReportLink } from '@/lib/dominical-report';

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem('LC_AUTH_TOKEN')?.trim() ?? '';
}

export default function DominicalReportsPage() {
  const { loading: authLoading, logout, user } = useAuth();
  const [dominicalLinks, setDominicalLinks] = useState<DominicalReportLink[]>([]);
  const [dominicalLoading, setDominicalLoading] = useState(true);
  const [dominicalError, setDominicalError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !getStoredAuthToken()) {
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      setDominicalLoading(true);
      setDominicalError(null);

      void apiClient
        .get<DominicalReportLink[]>('/asistencias-dominicales/reportes/links')
        .then(({ data }) => {
          if (!active) {
            return;
          }

          setDominicalLinks(data);
        })
        .catch((error: unknown) => {
          if (!active) {
            return;
          }

          console.error(error);
          if (isUnauthorizedError(error)) {
            setSessionError(
              'Tu sesión expiró o no es válida. Inicia sesión nuevamente para consultar los reportes.',
            );
            logout();
            return;
          }

          setDominicalError('No se pudieron cargar los enlaces Dominicales.');
        })
        .finally(() => {
          if (active) {
            setDominicalLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const sessionUnavailable = !authLoading && (!user || !getStoredAuthToken());

  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Libres en Cristo Jesús
          </p>
          <h1 className="text-xl font-semibold text-gray-800">Reportes Dominicales</h1>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/admin/reportes"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a Reportes
          </Link>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Selección de reporte
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Enlaces Dominicales</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Seleccioná un enlace para abrir su reporte histórico de solo lectura.
                </p>
              </div>
              <span className="text-sm text-slate-500">{dominicalLinks.length} enlaces</span>
            </div>

            {sessionError ? (
              <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
                {sessionError}
              </p>
            ) : sessionUnavailable ? (
              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Inicia sesión para consultar los enlaces Dominicales.
              </p>
            ) : dominicalLoading ? (
              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Cargando enlaces Dominicales...
              </p>
            ) : dominicalError ? (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
                {dominicalError}
              </p>
            ) : dominicalLinks.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No hay enlaces Dominicales registrados.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dominicalLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={`/admin/reportes/dominical/${link.id}`}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{link.nombre}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Sede: {link.sede?.nombre || 'Sin sede'} · {link.diaRegistro}
                        </p>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-700"
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        link.estado === 'ACTIVO'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {link.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
