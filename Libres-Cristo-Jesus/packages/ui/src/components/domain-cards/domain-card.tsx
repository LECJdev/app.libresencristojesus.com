'use client';

import type { LucideIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { Card } from '../card/card';

export interface DomainCardProps extends ComponentPropsWithoutRef<'div'> {
  /** Makes the whole card activatable. Omit for a read-only card. */
  onClick?: () => void;
  children: ReactNode;
}

/**
 * Shell shared by every domain card (Distrito, Casa de Paz, Reunión,
 * Persona).
 *
 * Its reason to exist is the clickable-card accessibility problem: a `div`
 * with an `onClick` is invisible to the keyboard. Solving it once here —
 * `role="button"`, `tabIndex`, Enter/Space activation — guarantees doc18
 * §27's "Teclado 100%" on all four cards instead of relying on each one
 * remembering it.
 */
export function DomainCard({ onClick, className, children, ...props }: DomainCardProps) {
  const isInteractive = onClick !== undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onClick === undefined) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      // Space would otherwise scroll the page.
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      interactive={isInteractive}
      className={cn('flex flex-col gap-3 p-4', isInteractive && 'cursor-pointer', className)}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      {...props}
    >
      {children}
    </Card>
  );
}

export interface DomainCardMetaProps {
  icon: LucideIcon;
  /** Accessible name for the icon, e.g. "Dirección". */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * One "icon + value" line inside a card. The icon is decorative and the
 * meaning is carried by the visually hidden label, so the row is never
 * understood by glyph alone (doc18 §27).
 */
export function DomainCardMeta({ icon, label, children, className }: DomainCardMetaProps) {
  return (
    <p
      className={cn('flex min-w-0 items-center gap-2 text-small text-foreground-muted', className)}
    >
      <Icon icon={icon} size="xs" />
      <span className="sr-only">{label}:</span>
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}

export interface DomainCardMetricsProps {
  metrics: { label: string; value: string | number }[];
}

/**
 * Compact metric strip at the foot of a card. Values use the KPI weight of
 * doc18 §4 ("Números KPI: Bold") at a smaller step than `<KPICard>`.
 */
export function DomainCardMetrics({ metrics }: DomainCardMetricsProps) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
      {metrics.map((metric, index) => (
        <div key={`${metric.label}-${index}`} className="flex flex-col">
          <dt className="text-caption text-foreground-muted">{metric.label}</dt>
          <dd className="text-body font-bold text-foreground">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
