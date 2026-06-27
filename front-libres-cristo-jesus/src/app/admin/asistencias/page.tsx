'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AsistenciasPage() {
  const { adminNavigationSections } = useAuth();
  const sections = adminNavigationSections.attendance;

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
         {sections.map((section) => {
           const Icon = section.icon;

           return (
             <Link
               key={section.id}
               href={section.path}
               className="bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition"
             >
               <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                 <Icon className="h-5 w-5" />
               </div>
               <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
               <p className="text-sm text-slate-500 mt-2">{section.description}</p>
             </Link>
           );
         })}
        </div>
    </div>
  );
}
