'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * KPIGrid — the "KPIs (si aplica)" row of the standard page pattern
 * (doc18 §30) and the top band of every dashboard (doc18 §14, doc25 §5).
 *
 * The column counts follow the documented grid (doc18 §6): the 4-column
 * mobile grid holds one card, the 8-column tablet grid two, and the
 * 12-column desktop grid four. Breakpoints come from the `tablet` /
 * `desktop` tokens rather than hard-coded widths.
 */
const kpiGridVariants = cva('grid w-full min-w-0 gap-4', {
  variants: {
    columns: {
      2: 'grid-cols-1 tablet:grid-cols-2',
      3: 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3',
      4: 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4',
    },
  },
  defaultVariants: {
    columns: 4,
  },
});

export interface KPIGridProps
  extends ComponentPropsWithoutRef<'div'>, VariantProps<typeof kpiGridVariants> {
  /** Cards per row at the desktop breakpoint. Defaults to 4. */
  columns?: 2 | 3 | 4;
}

export function KPIGrid({ columns, className, ...props }: KPIGridProps) {
  return <div className={cn(kpiGridVariants({ columns }), className)} {...props} />;
}
