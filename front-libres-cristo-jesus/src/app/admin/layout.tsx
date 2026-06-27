'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, FolderTree, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { ROLE_LABELS } from '@/lib/roles';
import BrandLogo from '@/components/BrandLogo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    isAdmin,
    adminNavigationSections,
    defaultAdminPath,
    canAccessAdminPath,
    logout,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAuthorizedForPath = useMemo(() => canAccessAdminPath(pathname), [canAccessAdminPath, pathname]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/login');
    }

    if (!loading && isAdmin && !isAuthorizedForPath && defaultAdminPath) {
      router.push(defaultAdminPath);
    }
  }, [defaultAdminPath, isAdmin, isAuthorizedForPath, loading, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsSidebarOpen(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  if (loading || !isAdmin || !isAuthorizedForPath) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  const { main: routes, structure: structureRoutes, superAdmin: superAdminRoutes } = adminNavigationSections;

  const isInStructureSection = structureRoutes.some(
    (route) => pathname === route.path || pathname.startsWith(`${route.path}/`),
  );

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 z-30 bg-slate-950/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {!isSidebarOpen && (
        <button
          type="button"
          aria-label="Abrir menú lateral"
          className="fixed left-3 top-3 z-30 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/5 ring-1 ring-slate-950/5 md:left-4 md:top-4 md:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[88vw] flex-col bg-slate-900 text-white transition-transform duration-200 md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex min-h-16 items-center gap-3 border-b border-slate-800 bg-slate-950 px-5 py-3 md:px-6">
          <div className="min-w-0 flex flex-col">
            <BrandLogo variant="horizontal" className="h-10 w-auto max-w-[180px] object-contain" priority />
          </div>
          <button
            type="button"
            aria-label="Cerrar menú lateral"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 md:px-4 md:py-6">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive =
              route.path === '/admin'
                ? pathname === route.path
                : pathname === route.path || pathname.startsWith(`${route.path}/`);
            return (
              <Link
                key={route.path}
                href={route.path}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                   isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                 }`}
              >
                <Icon className="h-5 w-5" />
                 {route.label}
               </Link>
             );
           })}

          {structureRoutes.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStructureOpen((prev) => !prev)}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4" />
                    Estructura
                  </span>
                  {isStructureOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
              {(isStructureOpen || isInStructureSection) && (
                <div className="space-y-1">
                  {structureRoutes.map((route) => {
                    const Icon = route.icon;
                    const isActive =
                      pathname === route.path || pathname.startsWith(`${route.path}/`);
                    return (
                      <Link
                        key={route.path}
                        href={route.path}
                        className={`ml-3 flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {route.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {superAdminRoutes.length > 0 && (
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
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                       isActive ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-slate-800'
                     }`}
                  >
                    <Icon className="h-5 w-5" />
                     {route.label}
                   </Link>
                 );
               })}
            </>
          )}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm">
              {user?.nombres?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-white">{user?.nombres}</p>
              <p className="text-xs text-slate-400">
                {user?.rol ? ROLE_LABELS[user.rol] : 'Administrador'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden pt-16 md:pt-0">
        {children}
      </div>
    </div>
  );
}
