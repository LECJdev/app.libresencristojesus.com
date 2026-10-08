'use client';

import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import type { NavItem } from './sidebar';

/**
 * BottomNavigation — doc18 §26 ("Mobile: Bottom Navigation") and doc25 §3,
 * the mobile counterpart of `<Sidebar>`: it is the only navigation surface
 * below the tablet breakpoint and disappears from tablet up, where the
 * sidebar takes over. The two consume the same `NavItem[]`.
 *
 * Touch targets are at least 44x44 px (`min-h-11` = 44 px on the 4 px
 * scale), matching doc25 §2 "botones grandes y fáciles de presionar desde
 * dispositivos móviles" and the WCAG AA target-size guidance in doc18 §27.
 */
export interface BottomNavigationProps extends ComponentPropsWithoutRef<'nav'> {
  items: NavItem[];
  /** Receives the raw event so a router can take over the anchor — see `<Sidebar>`. */
  onNavigate?: (item: NavItem, event: MouseEvent<HTMLElement>) => void;
}

export function BottomNavigation({
  items,
  onNavigate,
  className,
  ...props
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface',
        // Mirror image of the sidebar rule: mobile only.
        'tablet:hidden',
        className,
      )}
      {...props}
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => (
          <li key={item.id} className="flex flex-1">
            <BottomNavigationLink item={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface BottomNavigationLinkProps {
  item: NavItem;
  onNavigate?: (item: NavItem, event: MouseEvent<HTMLElement>) => void;
}

function BottomNavigationLink({ item, onNavigate }: BottomNavigationLinkProps) {
  const content = (
    <>
      <span className="relative">
        <Icon icon={item.icon} size="sm" />
        {item.badge !== undefined ? (
          <span
            className={cn(
              'absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center',
              'rounded-full bg-error-500 px-1 text-caption font-semibold text-neutral-50',
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </span>
      {/* Kept visible (not icon-only) so the label never depends on a
          hover affordance that does not exist on touch devices. */}
      <span className="w-full truncate text-center text-caption font-medium">{item.label}</span>
    </>
  );

  const shared = {
    // `min-h-11` == 44 px: the minimum comfortable touch area.
    className: cn(
      'flex min-h-11 w-full flex-col items-center justify-center gap-1 px-1 py-2',
      'transition-colors duration-fast',
      item.active ? 'text-primary-700' : 'text-foreground-muted hover:text-foreground',
    ),
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
