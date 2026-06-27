'use client';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const { adminNavigationSections } = useAuth();
  const quickLinks = adminNavigationSections.main.filter((section) => section.id !== 'dashboard');

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

        {quickLinks.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Available Sections</h2>
              <p className="text-sm text-gray-500">The panel now renders navigation from section access rules.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map((section) => {
                const Icon = section.icon;

                return (
                  <Link
                    key={section.id}
                    href={section.path}
                    className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/30"
                  >
                    <div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-slate-900">{section.label}</h3>
                        <p className="mt-1 text-sm text-slate-500">{section.path}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
