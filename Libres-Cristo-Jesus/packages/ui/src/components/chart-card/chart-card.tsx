'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Card } from '../card/card';
import { Skeleton } from '../skeleton/skeleton';

export interface ChartCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: string;
  description?: string;
  /** Contextual controls, e.g. a period switch. */
  actions?: ReactNode;
  loading?: boolean;
  /** Renders the "sin datos" message instead of the chart. */
  isEmpty?: boolean;
  /** Message shown when `isEmpty` is true. */
  emptyMessage?: string;
  /** The chart itself. */
  children: ReactNode;
}

/**
 * ChartCard — the single container every graph in the product sits in
 * (doc18 §24, doc18 §29 "Componentes de Datos").
 *
 * It is deliberately chart-library agnostic: the graph arrives as
 * `children`. That keeps the charting dependency out of the Design System
 * and means a future switch of library touches zero container code.
 *
 * A fixed height is intentional — the loading skeleton, the empty message
 * and the real chart all occupy the same box, so the dashboard never
 * reflows as data streams in (doc18 §20/§23).
 */
export function ChartCard({
  title,
  description,
  actions,
  loading = false,
  isEmpty = false,
  emptyMessage = 'Aún no hay datos para graficar.',
  children,
  className,
  ...props
}: ChartCardProps) {
  return (
    <Card className={cn('flex flex-col gap-4 p-6', className)} {...props}>
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-h4 font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-small text-foreground-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      <div className="min-h-64 w-full min-w-0">
        {loading ? (
          <ChartCardSkeleton />
        ) : isEmpty ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-center text-small text-foreground-muted">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

/**
 * doc18 §20: "Nunca spinner infinito. Siempre Skeleton." The bars hint at
 * a chart shape rather than showing a generic block, so the placeholder
 * reads as "a graph is loading here".
 */
function ChartCardSkeleton() {
  const barHeights = ['h-24', 'h-40', 'h-32', 'h-52', 'h-36', 'h-44'];

  return (
    <div aria-hidden="true" className="flex h-64 items-end gap-3">
      {barHeights.map((height, index) => (
        <Skeleton key={`chart-bar-${index}`} className={cn('w-full', height)} />
      ))}
    </div>
  );
}
