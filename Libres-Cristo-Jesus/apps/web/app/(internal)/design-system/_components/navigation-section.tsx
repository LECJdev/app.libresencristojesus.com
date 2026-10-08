'use client';

import { BottomNavigation, Breadcrumb, Header, Pagination, Sidebar, type NavItem } from '@lcj/ui';
import { Bell, Home, Settings, Users } from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Inicio', icon: Home, active: true },
  { id: 'people', label: 'Personas', icon: Users, badge: 3 },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

const BREADCRUMB_ITEMS = [
  { label: 'Distritos', href: '#' },
  { label: 'Distrito Norte', href: '#' },
  { label: 'Casas de Paz', href: '#' },
  { label: 'Betania' },
];

export function NavigationSection() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Header</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <Header
            title="Casas de Paz"
            onMenuClick={() => setMenuOpen((current) => !current)}
            user={{ name: 'Ana Torres', roleLabel: 'Pastora de Distrito' }}
          />
        </div>
        <p className="text-caption text-foreground-muted">
          Menú {menuOpen ? 'abierto' : 'cerrado'} (botón visible solo debajo del breakpoint
          desktop).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Sidebar</h3>
        <p className="text-small text-foreground-muted">
          Visible desde el breakpoint tablet (768px) — icon-only en tablet, expandido en desktop.
        </p>
        <div className="h-80 overflow-hidden rounded-lg border border-border">
          <Sidebar items={NAV_ITEMS} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">BottomNavigation</h3>
        <p className="text-small text-foreground-muted">
          Visible solo por debajo del breakpoint tablet (768px) — reduce el ancho de la ventana para
          verla, fija al borde inferior de la pantalla.
        </p>
        <BottomNavigation items={NAV_ITEMS} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Breadcrumb</h3>
        <Breadcrumb items={BREADCRUMB_ITEMS} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-semibold text-foreground">Pagination</h3>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={237}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
