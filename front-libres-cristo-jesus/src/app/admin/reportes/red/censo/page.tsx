'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, Download, Network } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import {
  downloadRedCenso,
  type RedCensoReport,
} from '@/lib/red-censo-report-export';

interface RedOption {
  id: string;
  nombre: string | null;
}

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getStoredAuthToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return localStorage.getItem('LC_AUTH_TOKEN')?.trim() ?? '';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export default function RedCensoReportPage() {
  const { loading: authLoading, logout, user } = useAuth();
  const [redes, setRedes] = useState<RedOption[]>([]);
  const [redId, setRedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !getStoredAuthToken()) {
      return;
    }

    let active = true;

    void apiClient
      .get<RedOption[]>('/redes')
      .then(({ data }) => {
        if (active) {
          setRedes(data);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        console.error(requestError);
        if (isUnauthorizedError(requestError)) {
          setError('Tu sesión expiró o no es válida. Inicia sesión nuevamente.');
          logout();
          return;
        }

        setError(getErrorMessage(requestError, 'No se pudieron cargar las Redes/Distritos.'));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleDownload = async () => {
    if (!redId) {
      setError('Seleccioná una Red/Distrito antes de descargar el censo.');
      setFeedback(null);
      return;
    }

    if (!user || !getStoredAuthToken()) {
      setError('Tu sesión expiró o no es válida. Inicia sesión nuevamente.');
      setFeedback(null);
      return;
    }

    setExporting(true);
    setError(null);
    setFeedback(null);

    try {
      const { data } = await apiClient.get<RedCensoReport>('/personas/export-censo', {
        params: { redId },
      });

      await downloadRedCenso(data);
      setFeedback(
        data.rows.length === 0
          ? 'La Red/Distrito seleccionada no tiene personas registradas. Se descargó el censo vacío.'
          : `Se descargó el censo de ${data.rows.length} personas.`,
      );
    } catch (requestError: unknown) {
      console.error(requestError);
      if (isUnauthorizedError(requestError)) {
        setError('Tu sesión expiró o no es válida. Inicia sesión nuevamente.');
        logout();
        return;
      }

      setError(getErrorMessage(requestError, 'No se pudo descargar el censo de la Red/Distrito seleccionada.'));
    } finally {
      setExporting(false);
    }
  };

  const selectedRed = redes.find((red) => red.id === redId);
  const sessionUnavailable = !authLoading && (!user || !getStoredAuthToken());
  const displayError =
    error ??
    (sessionUnavailable ? 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.' : null);

  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Libres en Cristo Jesús
          </p>
          <h1 className="text-xl font-semibold text-gray-800">Reportes por Red</h1>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/admin/reportes"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Reportes
          </Link>

          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  Reportes por Red
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Censo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Descargá el formato de censo filtrado por una Red/Distrito. La selección se aplica en el servidor antes de preparar las filas.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <label htmlFor="red-censo" className="text-sm font-medium text-slate-700">
                Red/Distrito
              </label>
              <select
                id="red-censo"
                value={redId}
                onChange={(event) => {
                  setRedId(event.target.value);
                  setError(null);
                  setFeedback(null);
                }}
                disabled={authLoading || sessionUnavailable || loading || exporting || redes.length === 0}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {authLoading
                    ? 'Validando sesión...'
                    : sessionUnavailable
                      ? 'Sesión no disponible'
                      : loading
                        ? 'Cargando Redes/Distritos...'
                        : 'Seleccioná una Red/Distrito'}
                </option>
                {redes.map((red) => (
                  <option key={red.id} value={red.id}>
                    {red.nombre || red.id}
                  </option>
                ))}
              </select>
              {selectedRed && (
                <p className="text-xs text-slate-500">
                  Se usará “{selectedRed.nombre || selectedRed.id}” en la columna Distrito del workbook.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={authLoading || sessionUnavailable || loading || exporting || !redId}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Preparando censo...' : 'Descargar Censo'}
            </button>

            {redes.length === 0 && !loading && !error && (
              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                No hay Redes/Distritos disponibles para generar el censo.
              </p>
            )}
            {displayError && (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {displayError}
              </p>
            )}
            {feedback && (
              <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                {feedback}
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
