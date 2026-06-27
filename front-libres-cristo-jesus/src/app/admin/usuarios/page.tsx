'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Search, ShieldCheck, ShieldPlus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ROLE_COLORS, ROLE_LABELS, type UserRole } from '@/lib/roles';

interface Persona {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  celular: string | null;
  correo: string | null;
  documento: string | null;
  rol: UserRole;
  roles?: UserRole[];
}

export default function AdminUsuarios() {
  const { hasAdminSectionAccess, loading } = useAuth();
  const router = useRouter();
  const canAccessUserManagement = hasAdminSectionAccess('users');

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [recentPromotions, setRecentPromotions] = useState<Persona[]>([]);

  const fetchPersonas = async () => {
    try {
      setLoadingPersonas(true);
      const res = await apiClient.get('/personas');
      setPersonas(res.data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las personas registradas.');
    } finally {
      setLoadingPersonas(false);
    }
  };

  useEffect(() => {
    if (!loading && !canAccessUserManagement) {
      router.push('/admin');
      return;
    }

    if (!loading && canAccessUserManagement) {
      const timeoutId = window.setTimeout(() => {
        void fetchPersonas();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [canAccessUserManagement, loading, router]);

  const eligiblePersonas = useMemo(
    () =>
      personas.filter(
        (persona) =>
          persona.rol === 'INTEGRANTE' &&
          Boolean(persona.correo) &&
          Boolean(persona.documento),
      ),
    [personas],
  );

  const filteredPersonas = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return eligiblePersonas;
    }

    return eligiblePersonas.filter((persona) => {
      const correo = persona.correo?.toLowerCase() ?? '';
      return correo.includes(query);
    });
  }, [eligiblePersonas, searchTerm]);

  const selectedPersona = eligiblePersonas.find(
    (persona) => persona.id === selectedPersonaId,
  );

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPersonaId) {
      setError('Seleccioná una persona para promover.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await apiClient.post(
        '/personas/admin/promover-personal-administrativo',
        {
          personaId: selectedPersonaId,
        },
      );

      const promoted = res.data as Persona;
      const fullName = [promoted.nombres, promoted.apellidos]
        .filter(Boolean)
        .join(' ');

      setSuccess(
        `"${fullName || promoted.correo}" fue promovido a Personal Administrativo.`,
      );
      setRecentPromotions((prev) => [promoted, ...prev.filter((item) => item.id !== promoted.id)]);
      setSelectedPersonaId('');
      setSearchTerm('');
      await fetchPersonas();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Error al promover la persona');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !canAccessUserManagement) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      <header className="flex min-h-16 items-center border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Promoción de Personal Administrativo</h1>
            <p className="text-sm text-gray-500">Solo el Super Administrador puede habilitar este acceso.</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900">
            Seleccioná una persona ya registrada con correo y documento. Su acceso inicial quedará habilitado con correo + documento.
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">Promover persona existente</h2>
            </div>

            <form onSubmit={handlePromote} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Buscar por correo</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: persona@correo.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Personas elegibles</label>
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {loadingPersonas ? (
                    <p className="text-sm text-gray-500">Cargando personas...</p>
                  ) : filteredPersonas.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay personas elegibles que coincidan con ese correo.
                    </p>
                  ) : (
                    filteredPersonas.map((persona) => {
                      const isSelected = persona.id === selectedPersonaId;
                      const fullName = [persona.nombres, persona.apellidos]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <button
                          key={persona.id}
                          type="button"
                          onClick={() => {
                            setSelectedPersonaId(persona.id);
                            setError('');
                            setSuccess('');
                          }}
                          className={`w-full rounded-lg border p-4 text-left transition-colors ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{fullName || 'Sin nombre registrado'}</p>
                              <p className="text-sm text-gray-600">{persona.correo}</p>
                              <p className="text-xs text-gray-500">
                                Documento: {persona.documento} · Celular: {persona.celular || '—'}
                              </p>
                            </div>
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[persona.rol]}`}>
                              {ROLE_LABELS[persona.rol]}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedPersona && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Vas a promover a <strong>{[selectedPersona.nombres, selectedPersona.apellidos].filter(Boolean).join(' ') || selectedPersona.correo}</strong> con el correo <strong>{selectedPersona.correo}</strong>.
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  ✓ {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedPersonaId}
                className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-70"
              >
                {submitting ? 'Promoviendo...' : 'Promover a Personal Administrativo'}
              </button>
            </form>
          </div>

          {recentPromotions.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h2 className="text-base font-semibold text-gray-800">Promociones realizadas en esta sesión</h2>
              </div>

              <div className="space-y-3">
                {recentPromotions.map((persona) => (
                  <div
                    key={persona.id}
                    className="flex flex-col gap-3 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {[persona.nombres, persona.apellidos].filter(Boolean).join(' ') || 'Sin nombre registrado'}
                      </p>
                      <p className="text-xs text-gray-500">{persona.correo || 'Sin correo'}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[persona.rol]}`}>
                      {ROLE_LABELS[persona.rol]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
