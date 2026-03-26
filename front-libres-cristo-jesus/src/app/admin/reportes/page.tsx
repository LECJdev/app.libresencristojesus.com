'use client';
import { BarChart3 } from 'lucide-react';

export default function AdminReportes() {
  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Reportes</h1>
      </header>
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Módulo de Reportes</h2>
          </div>
          <p className="text-gray-600">
            Próximamente: aquí se podrán ver métricas y generar reportes de asistencias consolidables.
          </p>
        </div>
      </main>
    </>
  );
}
