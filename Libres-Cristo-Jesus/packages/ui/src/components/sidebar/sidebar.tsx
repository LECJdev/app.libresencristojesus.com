'use client';

import { cva } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

/**
 * A single navigation entry. Shared by `<Sidebar>`, `<BottomNavigation>`
 * and `<AppShell>` so one array feeds every navigation surface and they can
 * never drift apart.
 *
 * Deliberately route-agnostic: `href` is an opaque string and `active` is
 * supplied by the caller. The Design System never reads the router, so
 * `@lcj/ui` stays framework-neutral and testable in isolation.
 */
export interface NavItem {
  /** Stable React key and lookup id. */
  id: string;
  /** Visible label — Spanish, supplied by the app. */
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  /** Counter or short marker, e.g. pending items. */
  badge?: string | number;
}

/**
 * Sidebar — doc18 §26 and doc25 §3.
 *
 * Desktop  (>= 1280px): fixed sidebar, icon + label.
 * Tablet   (>= 768px):  contracted, icons only.
 * Mobile   (< 768px):   not rendered at all — the app uses `<Drawer>` and
 *                       `<BottomNavigation>` instead.
 *
 * The `tablet` / `desktop` breakpoints come from `styles/tokens.css`
 * (`--breakpoint-tablet`, `--breakpoint-desktop`), so the collapse points
 * match the documented 4/8/12-column grid rather than ad-hoc widths.
 *
 * SURFACE (project-owner decision, `Banco-imagenes/colores-proyecto.jpg`
 * "Aplicación de colores en la interfaz"): solid deep blue
 * (`--color-primary-900`), not the themeable `--surface` token. Every other
 * surface in the product stays light and reads dark text off `--surface` /
 * `--background`; the sidebar is the one deliberate exception the brand
 * guide calls for, so its borders/hovers below are literal `white/…`
 * opacities rather than the semantic tokens — those tokens describe the
 * LIGHT chrome and would be invisible or wrong against this dark slab.
 */
const sidebarVariants = cva(
  [
    // Hidden below tablet: doc18 §26 gives mobile its own navigation.
    'hidden tablet:flex tablet:h-full tablet:shrink-0 tablet:flex-col',
    'border-r border-primary-950 bg-primary-900',
    'transition-[width] duration-base',
  ],
  {
    variants: {
      collapsed: {
        // Forced icon-only at every size.
        true: 'tablet:w-20',
        // Icon-only on tablet, full width from desktop up.
        false: 'tablet:w-20 desktop:w-64',
      },
    },
    defaultVariants: {
      collapsed: false,
    },
  },
);

export interface SidebarProps extends Omit<ComponentPropsWithoutRef<'aside'>, 'onSelect'> {
  items: NavItem[];
  /** Forces the icon-only rail at every breakpoint. */
  collapsed?: boolean;
  /**
   * Fired on click/Enter. The app owns the actual navigation.
   *
   * The raw event is forwarded so a router-driven app can `preventDefault()`
   * and navigate client-side while `href` stays a real, copyable,
   * middle-clickable link. Without it the anchor would always perform a full
   * document load, which is a different product entirely in an SPA.
   */
  onNavigate?: (item: NavItem, event: MouseEvent<HTMLElement>) => void;
  /** Slot above the list, typically the institutional logo. */
  header?: ReactNode;
  /** Slot pinned to the bottom, typically the user or version indicator. */
  footer?: ReactNode;
  /**
   * Item ids after which a subtle divider renders, grouping related
   * sections (e.g. "Organización" / "Operación" / "Configuración"). Purely
   * a rendering hint — the grouping lives at the call site, not in
   * `NavItem` itself, so the Design System never has to know the app's
   * information architecture. An id absent from the (role-filtered) `items`
   * list is simply never matched, so a shorter menu never breaks.
   */
  dividerAfterIds?: readonly string[];
}

export function Sidebar({
  items,
  collapsed = false,
  onNavigate,
  header,
  footer,
  dividerAfterIds,
  className,
  ...props
}: SidebarProps) {
  return (
    <aside className={cn(sidebarVariants({ collapsed }), className)} {...props}>
      {header ? (
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-b border-white/10 px-4 py-6">
          {header}
        </div>
      ) : null}

      <nav aria-label="Navegación principal" className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li key={item.id}>
              <SidebarLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
              {dividerAfterIds?.includes(item.id) && index < items.length - 1 ? (
                <div aria-hidden="true" className="mx-2 my-2 border-t border-white/10" />
              ) : null}
            </li>
          ))}
        </ul>
      </nav>

      {footer ? <div className="shrink-0 border-t border-white/10 p-3">{footer}</div> : null}
    </aside>
  );
}

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: (item: NavItem, event: MouseEvent<HTMLElement>) => void;
}

function SidebarLink({ item, collapsed, onNavigate }: SidebarLinkProps) {
  const linkClassName = cn(
    'group relative flex w-full items-center gap-3 rounded-md py-2.5',
    // A touch more left padding than right: it leaves room for the active
    // accent bar without the label visually re-centring when it appears.
    'pl-4 pr-3',
    'text-small font-medium transition-colors duration-fast',
    // Justify centre while collapsed so the icon sits in the middle of the rail.
    collapsed ? 'justify-center' : 'justify-center desktop:justify-start',
    item.active ? 'bg-white/10 text-white' : 'text-primary-100 hover:bg-white/10 hover:text-white',
    // doc18 §27: focus must always be visible. The global `:focus-visible`
    // outline (`--ring`, a medium blue) would sit blue-on-blue against this
    // dark surface, so it is replaced here with a gold ring that actually
    // clears contrast on `primary-900`.
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900',
  );

  const content = (
    <>
      {/* Active indicator — a gold accent bar, not just a fill change, so
          the current section reads at a glance even on the icon-only
          tablet rail where the fill alone is easy to miss. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-2 left-0 w-1 rounded-r-full bg-gold-500 transition-opacity duration-fast',
          item.active ? 'opacity-100' : 'opacity-0',
        )}
      />

      <Icon icon={item.icon} size="sm" />

      {/* The label is display-hidden in the rail, so `aria-label` on the
          control below carries the accessible name in every state. */}
      <span className={cn('flex-1 truncate', collapsed ? 'hidden' : 'hidden desktop:inline')}>
        {item.label}
      </span>

      {item.badge !== undefined ? (
        <span
          className={cn(
            'inline-flex min-w-5 items-center justify-center rounded-full px-1.5',
            'text-caption font-semibold',
            item.active ? 'bg-gold-500 text-primary-950' : 'bg-white/15 text-white',
            // Collapsed: float the counter over the icon instead of pushing
            // the row wider than the rail.
            collapsed
              ? 'absolute right-1 top-1'
              : 'absolute right-1 top-1 desktop:static desktop:right-auto desktop:top-auto',
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </>
  );

  const shared = {
    className: linkClassName,
    'aria-label': item.label,
    title: item.label,
    'aria-current': item.active ? ('page' as const) : undefined,
  };

  if (item.href !== undefined) {
    return (
      <a href={item.href} {...shared} onClick={(event) => onNavigate?.(item, event)}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" {...shared} onClick={(event) => onNavigate?.(item, event)}>
      {content}
    </button>
  );
}
