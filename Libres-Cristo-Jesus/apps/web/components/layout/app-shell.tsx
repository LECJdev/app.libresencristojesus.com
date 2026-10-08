'use client';

import { useCallback, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import {
  BottomNavigation,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Header,
  Icon,
  Sidebar,
  cn,
  type NavItem,
} from '@lcj/ui';
import { ROLE_NAME_LABELS, type AuthenticatedUser } from '@lcj/types';
import { useSessionStore } from '@/store/session-store';
import { useLogout } from '@/hooks/use-auth';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import {
  findNavItemByPathname,
  navItemsForRole,
  primaryNavItemsForRole,
  type AppNavItem,
} from '@/lib/navigation';
import { AppBrand, BrandMark } from './app-brand';
import { HeaderSearch } from './header-search';

/**
 * Visual grouping for the sidebar (project-owner ask: "Organización" /
 * "Operación" / "Configuración" separators). Ids only, not a field on
 * `AppNavItem` — the grouping is a rendering concern of this shell, not
 * part of the navigation data `lib/navigation.ts` owns, and role-filtered
 * lists that omit one of these ids simply never render that divider.
 */
const SIDEBAR_GROUP_DIVIDERS = ['lideres', 'reportes'] as const;

/**
 * AppShell — the persistent frame of every authenticated screen (doc25 §3,
 * doc18 §30): navigation on the left (or bottom, on a phone), header on top,
 * routed content in the middle.
 *
 * The three navigation surfaces (`Sidebar`, `BottomNavigation`, drawer) are
 * fed by one filtered array, so a section can never be visible in one and
 * missing from another.
 */

/**
 * A `LeadershipUnit` is not a person — it is a unit of up to two members
 * (doc04 §4). The first member's name is what a human recognises; the
 * username is the fallback for a unit whose members are not registered yet.
 */
function displayNameFor(user: AuthenticatedUser): string {
  const [firstMember] = user.members;
  if (!firstMember) {
    return user.username;
  }
  return `${firstMember.firstName} ${firstMember.lastName}`.trim();
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSessionStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();
  const { submit: performLogout, isPending: isLoggingOut } = useLogout();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // `user.photo` is a stored path behind the authenticated `GET /files/*path`
  // endpoint (see `use-resolved-photo.ts`), so it can't be used as a plain
  // `<img src>` — it has to be fetched with the bearer token and turned into
  // an object URL first.
  const resolvedUserPhoto = useStoredFilePreview(user?.photo ?? null);

  const activeItem = findNavItemByPathname(pathname);

  const toNavItem = useCallback(
    (item: AppNavItem): NavItem => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      href: item.href,
      active: item.id === activeItem?.id,
    }),
    [activeItem],
  );

  const allowedItems = useMemo(() => (user ? navItemsForRole(user.role) : []), [user]);
  const sidebarItems = useMemo(() => allowedItems.map(toNavItem), [allowedItems, toNavItem]);
  const bottomItems = useMemo(
    () => (user ? primaryNavItemsForRole(user.role).map(toNavItem) : []),
    [user, toNavItem],
  );

  // Reuses the same role-filtered menu the sidebar renders, rather than a
  // second `role === RoleName.ADMIN` check — "can this role see the
  // Configuración link" is exactly the question `navItemsForRole` already
  // answers for the sidebar's own "configuracion" entry.
  const canOpenSettings = allowedItems.some((item) => item.id === 'configuracion');

  const handleNavigate = useCallback(
    (item: NavItem, event: MouseEvent<HTMLElement>) => {
      // A modified click means "open elsewhere" — hijacking it would break a
      // browser affordance users rely on, and the `href` is a real URL, so
      // letting the browser win here costs nothing.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      setIsDrawerOpen(false);
      if (item.href !== undefined) {
        // Client-side push, not a document load: the access token lives in
        // memory (`store/session-store.ts`) and a full reload would discard
        // it, forcing a refresh round-trip on every menu click.
        router.push(item.href);
      }
    },
    [router],
  );

  if (!user) {
    // `SessionGate` renders this shell only once the session is confirmed, so
    // this is unreachable in practice — it exists so the type narrowing below
    // is honest rather than asserted with `!`.
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        items={sidebarItems}
        onNavigate={handleNavigate}
        header={<AppBrand />}
        dividerAfterIds={SIDEBAR_GROUP_DIVIDERS}
        footer={<p className="text-center text-caption text-primary-200">Versión 1.0</p>}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={activeItem?.label}
          onMenuClick={() => {
            setIsDrawerOpen(true);
          }}
          // Only below `desktop`: from `desktop` up the full sidebar (logo +
          // wordmark) is on screen, so repeating the mark here would just
          // duplicate it right next to itself.
          brand={<BrandMark className="desktop:hidden" />}
          search={<HeaderSearch />}
          user={{
            name: displayNameFor(user),
            photo: resolvedUserPhoto ?? undefined,
            roleLabel: ROLE_NAME_LABELS[user.role],
          }}
          userMenu={
            <div className="flex flex-col gap-1">
              {canOpenSettings ? (
                <Link
                  href="/configuracion"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-small text-foreground transition-colors duration-fast hover:bg-surface-muted"
                >
                  <Icon icon={Settings} size="sm" />
                  Configuración
                </Link>
              ) : null}

              <div className="my-1 border-t border-border" />

              {/* Reuses `useLogout` from the hook above — the same submit
                  function that used to sit behind the header's standalone
                  logout button, now the dropdown's only exit. */}
              <button
                type="button"
                onClick={() => {
                  void performLogout();
                }}
                disabled={isLoggingOut}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-small text-error-600 transition-colors duration-fast hover:bg-error-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <Icon icon={LogOut} size="sm" />
                {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            </div>
          }
        />

        {/*
          The scroll container is `<main>`, not the page: the header stays
          pinned and the sidebar never scrolls with the content. `pb-24`
          clears the fixed BottomNavigation on mobile, where it would
          otherwise sit on top of the last rows of content.
        */}
        <main className="min-h-0 flex-1 overflow-y-auto pb-24 pt-6 tablet:pb-8">{children}</main>
      </div>

      <BottomNavigation items={bottomItems} onNavigate={handleNavigate} />

      {/*
        Mobile/tablet menu. The sidebar is a hidden-below-tablet icon rail, so
        below `desktop` the full labelled tree is only reachable here — which
        is why the header keeps its menu button until that breakpoint.
      */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent side="left" size="sm" className="desktop:hidden">
          <DrawerHeader>
            <DrawerTitle>Navegación</DrawerTitle>
          </DrawerHeader>

          <nav aria-label="Navegación completa">
            <ul className="flex flex-col gap-1">
              {allowedItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    aria-current={item.id === activeItem?.id ? 'page' : undefined}
                    onClick={(event) => {
                      handleNavigate(toNavItem(item), event);
                    }}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2',
                      'text-small font-medium transition-colors duration-fast',
                      item.id === activeItem?.id
                        ? 'bg-primary-50 text-primary-800'
                        : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
                    )}
                  >
                    <Icon icon={item.icon} size="sm" />
                    <span className="truncate">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
