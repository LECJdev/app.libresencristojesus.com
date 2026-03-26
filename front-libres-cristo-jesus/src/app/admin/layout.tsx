'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Users, BarChart3, QrCode, ShieldCheck, CalendarCheck, Network, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, isSuperAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/login');
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const routes = [
    { name: 'Panel General', path: '/admin', icon: LayoutDashboard },
    { name: 'Personas', path: '/admin/personas', icon: Users },
    { name: 'Redes', path: '/admin/redes', icon: Network },
    { name: 'Sedes', path: '/admin/sedes', icon: Building2 },
    { name: 'Distritos', path: '/admin/distritos', icon: MapPin },
    { name: 'Registros de Eventos', path: '/admin/eventos', icon: CalendarCheck },
    { name: 'Reportes', path: '/admin/reportes', icon: BarChart3 },
    { name: 'Generador QR', path: '/admin/qr', icon: QrCode },
  ];

  const superAdminRoutes = [
    { name: 'Gestión de Usuarios', path: '/admin/usuarios', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-6 bg-slate-950 font-bold text-lg tracking-wider">
          LEJ ADMIN
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = pathname === route.path;
            return (
              <Link
                key={route.path}
                href={route.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                {route.name}
              </Link>
            );
          })}

          {/* Super Admin exclusive section */}
          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Super Admin</p>
              </div>
              {superAdminRoutes.map((route) => {
                const Icon = route.icon;
                const isActive = pathname === route.path;
                return (
                  <Link
                    key={route.path}
                    href={route.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {route.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm">
              {user?.nombres?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.nombres}</p>
              <p className="text-xs text-slate-400">
                {user?.rol === 'SUPER_ADMIN' ? 'Super Administrador' : 'Administrador'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-md text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
