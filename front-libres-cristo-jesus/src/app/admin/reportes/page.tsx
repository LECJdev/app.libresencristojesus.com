'use client';
import { BarChart3 } from 'lucide-react';

export default function AdminReportes() {
  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Libres en Cristo Jesús</p>
          <h1 className="text-xl font-semibold text-gray-800">Reportes</h1>
        </div>
      </header>
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Próximamente</span>
              <h2 className="mt-2 text-lg font-semibold text-gray-800">Módulo de Reportes</h2>
            </div>
          </div>
          <p className="text-gray-600">
            Próximamente: aquí se podrán ver métricas y generar reportes de asistencias consolidables.
          </p>
        </div>
      </main>
    </>
  );
}
