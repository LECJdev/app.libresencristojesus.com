'use client';

import { Home, UserRound, X } from 'lucide-react';
import {
  getDominicalPersonName,
  type DominicalPersonDetailResponse,
  type DominicalReportPerson,
} from '@/lib/dominical-report';
import { ROLE_LABELS, type UserRole } from '@/lib/roles';

interface DominicalPersonDetailModalProps {
  selectedPerson: DominicalReportPerson | null;
  detail: DominicalPersonDetailResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

function valueOrDash(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatCasaPazRole(role: string) {
  switch (role) {
    case 'personaACargo':
      return 'Persona a cargo';
    case 'anfitrion':
      return 'Anfitrión';
    case 'liderPrincipal':
      return 'Líder principal';
    default:
      return role;
  }
}

export function DominicalPersonDetailModal({
  selectedPerson,
  detail,
  loading,
  error,
  onClose,
}: DominicalPersonDetailModalProps) {
  if (!selectedPerson) {
    return null;
  }

  const person = detail?.persona;
  const displayName = person
    ? `${person.nombres ?? ''} ${person.apellidos ?? ''}`.trim() || person.id
    : getDominicalPersonName(selectedPerson);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dominical-person-detail-title"
        className="max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-3xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Perfil seguro
            </p>
            <h2 id="dominical-person-detail-title" className="mt-1 break-words text-xl font-bold text-slate-900">
              {displayName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">ID: {selectedPerson.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de persona"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          {loading ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Cargando perfil y responsabilidades...
            </p>
          ) : error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
              {error}
            </p>
          ) : person ? (
            <>
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Perfil disponible</h3>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Documento', `${valueOrDash(person.tipoDocumento)} ${valueOrDash(person.documento)}`],
                    ['Celular', valueOrDash(person.celular)],
                    ['Correo', valueOrDash(person.correo)],
                    ['Fecha de nacimiento', valueOrDash(person.fechaNacimiento)],
                    ['Edad', valueOrDash(person.edad)],
                    ['Género', valueOrDash(person.genero)],
                    ['Dirección', valueOrDash(person.direccion)],
                    ['Barrio', valueOrDash(person.barrio)],
                    ['Ciudad', valueOrDash(person.ciudad)],
                    ['Departamento', valueOrDash(person.departamento)],
                    ['Encuentro', person.encuentro === null ? '—' : person.encuentro ? 'Completado' : 'Pendiente'],
                    ['Invitado por', person.invitadoPor ? `${person.invitadoPor.nombres ?? ''} ${person.invitadoPor.apellidos ?? ''}`.trim() || person.invitadoPor.id : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="mt-1 break-words text-sm text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Red y Sede</h3>
                  <p className="mt-3 text-sm text-slate-700">
                    <strong>Red:</strong> {person.red?.nombre || person.red?.id || 'Sin Red asignada'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    <strong>Sede:</strong> {person.red?.sede?.nombre || person.red?.sede?.id || 'Sin Sede asignada'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {person.red?.sede?.direccion || person.red?.detalles || 'Sin detalles adicionales'}
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Roles actuales</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {person.roles.length > 0 ? person.roles.map((role) => (
                      <span key={role} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-800 shadow-sm">
                        {ROLE_LABELS[role as UserRole] || role}
                      </span>
                    )) : <span className="text-sm text-slate-500">Sin roles adicionales</span>}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Rol principal: {person.rol}</p>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Home className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Responsabilidades de Casa de Paz</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registro legado</h4>
                    {detail.casaDePaz.legacy.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Sin responsabilidad legada registrada.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {detail.casaDePaz.legacy.map((item) => (
                          <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                            <p className="font-medium">{item.direccion || 'Sin dirección'}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.detalle || 'Sin detalle'} · {item.activa === false ? 'Inactiva' : 'Activa'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roles en QR actuales</h4>
                    {detail.casaDePaz.qr.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Sin roles actuales en enlaces QR.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {detail.casaDePaz.qr.map((item) => (
                          <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                            <p className="font-medium">{item.nombre}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.roles.map(formatCasaPazRole).join(', ')} · {item.red?.nombre || 'Sin Red'} · {item.estado}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{item.direccionCasa} · {item.diaRegistro}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <p className="text-xs text-slate-400">
                Registrado: {formatDateTime(person.fechaCreacion)} · Actualizado: {formatDateTime(person.fechaModificacion)}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
