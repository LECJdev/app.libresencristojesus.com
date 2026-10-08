'use client';

import { Bell, BellOff, ChevronDown, Menu } from 'lucide-react';
import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { Avatar } from '../avatar/avatar';
import { buttonVariants } from '../button/button';
import { IconButton } from '../button/icon-button';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover';

/**
 * Identity block shown on the right of the header. `roleLabel` is a plain
 * string on purpose: role naming and permissions live in the domain layer
 * (doc05), never in the Design System.
 */
export interface HeaderUser {
  name: string;
  photo?: string;
  /** Already-translated role label, e.g. "Pastor de Distrito". */
  roleLabel?: string;
}

export interface HeaderProps extends ComponentPropsWithoutRef<'header'> {
  title?: string;
  user?: HeaderUser;
  /**
   * Opens the navigation Drawer on mobile/tablet (doc18 §26). When omitted
   * the menu button is not rendered at all.
   */
  onMenuClick?: () => void;
  /** Free slot for contextual controls (search, notifications, …). */
  actions?: ReactNode;
  /** Brand slot, typically a small logo — shown where the sidebar is not
   *  visible to carry the mark (the app decides that with `className`). */
  brand?: ReactNode;
  /** Compact global search, e.g. `<HeaderSearch>`. Omit to render nothing. */
  search?: ReactNode;
  /**
   * Content of the profile dropdown anchored to `user` (links, "Cerrar
   * sesión", …). The app owns the content — routing and the logout call are
   * its concerns, not the Design System's — this component only owns the
   * anchored open/close mechanics. Omitting it keeps the avatar/name block
   * static, exactly as before.
   */
  userMenu?: ReactNode;
}

/**
 * Header — the top bar of every screen (doc18 §30, doc25 §3).
 *
 * Mechanically presentational: the notifications bell is the one exception,
 * and only because its content needs no app data at all — an honest "no hay
 * notificaciones" is the whole truth of the feature until a real backend
 * exists, so hard-coding it here (rather than threading a slot for a state
 * that doesn't exist yet) keeps every consumer from having to repeat it.
 */
export function Header({
  title,
  user,
  onMenuClick,
  actions,
  brand,
  search,
  userMenu,
  className,
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3',
        'border-b border-border bg-surface px-4 desktop:px-6',
        className,
      )}
      {...props}
    >
      {onMenuClick ? (
        // doc18 §26: the sidebar only exists from tablet up and is a rail
        // there, so the drawer trigger stays available until desktop.
        <IconButton
          icon={Menu}
          aria-label="Abrir menú de navegación"
          variant="ghost"
          onClick={onMenuClick}
          className="desktop:hidden"
        />
      ) : null}

      {brand ? <div className="flex shrink-0 items-center">{brand}</div> : null}

      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-h4 font-semibold text-foreground">{title}</h1>
      ) : (
        <div className="flex-1" />
      )}

      {search}

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}

      <NotificationsButton />

      {user ? (
        userMenu ? (
          <UserMenuTrigger user={user} menu={userMenu} />
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Avatar src={user.photo} name={user.name} size="sm" />
            {/* Name and role are decorative next to the avatar on small
                screens; the avatar itself carries the accessible name. */}
            <div className="hidden min-w-0 flex-col leading-tight tablet:flex">
              <span className="truncate text-small font-medium text-foreground">{user.name}</span>
              {user.roleLabel ? (
                <span className="truncate text-caption text-foreground-muted">
                  {user.roleLabel}
                </span>
              ) : null}
            </div>
          </div>
        )
      ) : null}
    </header>
  );
}

/**
 * Bell + panel. No backend exists for notifications and none is invented
 * here — the panel always shows the honest empty state, never placeholder
 * data dressed up as real.
 */
function NotificationsButton() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Notificaciones"
        className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'size-11 px-0')}
      >
        <Icon icon={Bell} size="sm" />
      </PopoverTrigger>

      <PopoverContent className="w-72">
        <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
            <Icon icon={BellOff} size="sm" />
          </span>
          <p className="text-small font-medium text-foreground">No tenés notificaciones nuevas</p>
          <p className="text-caption text-foreground-muted">
            Te avisaremos aquí cuando haya novedades.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenuTrigger({ user, menu }: { user: HeaderUser; menu: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Menú de ${user.name}`}
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-md p-1 pr-2',
          'transition-colors duration-fast hover:bg-surface-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <Avatar src={user.photo} name={user.name} size="sm" />
        <div className="hidden min-w-0 flex-col items-start leading-tight tablet:flex">
          <span className="truncate text-small font-medium text-foreground">{user.name}</span>
          {user.roleLabel ? (
            <span className="truncate text-caption text-foreground-muted">{user.roleLabel}</span>
          ) : null}
        </div>
        <Icon
          icon={ChevronDown}
          size="xs"
          className="hidden shrink-0 text-foreground-muted tablet:block"
        />
      </PopoverTrigger>

      {/* Closes on any click inside — a clicked `Link` or "Cerrar sesión"
          button already did its job by the time this bubbles up, so this is
          a convenience, not a substitute for their own handlers. */}
      <PopoverContent
        className="w-56"
        onClick={() => {
          setOpen(false);
        }}
      >
        {menu}
      </PopoverContent>
    </Popover>
  );
}
