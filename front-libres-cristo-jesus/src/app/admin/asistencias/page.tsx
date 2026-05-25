'use client';

import Link from 'next/link';
import { CalendarDays, Users2, Home } from 'lucide-react';

const secciones = [
  {
    title: 'Dominical',
    description:
      'Configura asistencias por sede y registra personas mediante QR recurrente semanal.',
    href: '/admin/asistencias/dominical',
    icon: CalendarDays,
    implemented: true,
  },
  {
    title: 'Dicipulado',
    description:
      'Configura asistencias por sede o dirección personalizada, con red opcional y QR recurrente.',
    href: '/admin/asistencias/dicipulado',
    icon: Users2,
    implemented: true,
  },
  {
    title: 'Casa de Paz',
    description:
      'Gestiona asistencias por red con dirección de casa y registro público por QR.',
    href: '/admin/asistencias/casa-paz',
    icon: Home,
    implemented: true,
  },
];

export default function AsistenciasPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Asistencias
        </h1>
        <p className="text-slate-500 mt-1">
          Elegí el tipo de asistencia que querés administrar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-5">
        {secciones.map((seccion) => {
          const Icon = seccion.icon;

          return (
            <Link
              key={seccion.title}
              href={seccion.href}
              className={`bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition ${
                !seccion.implemented ? 'opacity-85' : ''
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{seccion.title}</h2>
              <p className="text-sm text-slate-500 mt-2">{seccion.description}</p>
              {!seccion.implemented && (
                <span className="inline-flex mt-4 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                  Próximamente
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
