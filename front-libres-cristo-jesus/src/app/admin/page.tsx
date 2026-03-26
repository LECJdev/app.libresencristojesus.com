'use client';
import { Users } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Panel General</h1>
      </header>
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stat Cards */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Registrados</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bienvenido al Panel de Administrador</h2>
          <p className="text-gray-600">
            Desde aquí podrás gestionar todo el sistema de Libres Cristo Jesús. Usa el menú lateral para navegar a las diferentes secciones.
          </p>
        </div>
      </main>
    </>
  );
}
