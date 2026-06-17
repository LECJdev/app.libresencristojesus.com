'use client';
import { Users } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

export default function AdminDashboard() {
  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandLogo variant="mark" className="h-11 w-11 object-contain" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Libres en Cristo Jesús</p>
            <h1 className="text-xl font-semibold text-gray-800">Panel General</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6 sm:mb-8">
          {/* Stat Cards */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Registrados</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Bienvenido al Panel de Administrador</h2>
          <p className="text-gray-600">
            Desde aquí podrás gestionar todo el sistema de Libres en Cristo Jesús. Usa el menú lateral para navegar a las diferentes secciones.
          </p>
        </div>
      </main>
    </>
  );
}
