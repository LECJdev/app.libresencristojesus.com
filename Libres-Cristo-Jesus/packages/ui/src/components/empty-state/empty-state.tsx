import { Inbox, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

/**
 * EmptyState — doc18 §21: an empty screen always carries three things,
 * illustration + message + action ("No existen asistentes" / "[ Crear primer
 * asistente ]"). A bare "sin datos" leaves the user with nothing to do.
 *
 * The illustration slot is a Lucide glyph rather than an SVG scene: doc18 §33
 * asks for a "línea moderna y minimalista" and explicitly rules out anything
 * decorative, and an icon keeps that promise at zero asset weight. Swapping in
 * real illustrations later means changing this one file.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stand-in illustration. Defaults to an empty tray. */
  icon?: LucideIcon;
  /** The headline — state the absence in the user's words, e.g. "No existen asistentes". */
  title: string;
  /** Optional second line explaining what to do about it. */
  description?: string;
  /** doc18 §21: the way out. Usually a `Button` that creates the first record. */
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { className, icon = Inbox, title, description, action, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        {/* Decorative: the title below already says what is missing, so an
            accessible name here would just repeat it. */}
        <Icon icon={icon} size="lg" />
      </span>

      <div className="flex max-w-md flex-col gap-2">
        <p className="text-h4 font-semibold">{title}</p>
        {description ? <p className="text-small text-foreground-muted">{description}</p> : null}
      </div>

      {action}
    </div>
  );
});
