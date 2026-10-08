'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { Card } from '../card/card';
import { Skeleton } from '../skeleton/skeleton';

export type KPITrendDirection = 'up' | 'down' | 'flat';

export interface KPITrend {
  direction: KPITrendDirection;
  /** Already-formatted delta, e.g. "8 %" or "12 personas". */
  value: string;
}

/**
 * Accent colours come from the token scales only (doc18 §28). `gold` maps
 * to the institutional secondary and is the accent doc18 §31 assigns to
 * "Pastores Generales".
 */
const kpiAccentVariants = cva('flex size-10 items-center justify-center rounded-md', {
  variants: {
    accent: {
      primary: 'bg-primary-50 text-primary-700',
      gold: 'bg-gold-50 text-gold-700',
      success: 'bg-success-50 text-success-700',
      warning: 'bg-warning-50 text-warning-700',
      error: 'bg-error-50 text-error-700',
      info: 'bg-info-50 text-info-700',
      neutral: 'bg-surface-muted text-foreground-muted',
    },
  },
  defaultVariants: {
    accent: 'primary',
  },
});

export interface KPICardProps
  extends ComponentPropsWithoutRef<'div'>, VariantProps<typeof kpiAccentVariants> {
  /** Metric name, e.g. "Asistencia". */
  label: string;
  /** Pre-formatted figure. Formatting (currency, units) belongs to the app. */
  value: string | number;
  trend?: KPITrend;
  icon?: LucideIcon;
  loading?: boolean;
  /**
   * Optional mini trend chart, rendered by the caller (e.g. a tiny Recharts
   * `<LineChart>`) so this primitive never takes a charting library as a
   * dependency. Additive and opt-in: omitted, the card renders exactly as
   * before. Only shown outside the `loading` state.
   */
  sparkline?: ReactNode;
}

/**
 * KPICard — the MetricCard of doc18 §13, whose worked example is exactly
 * "Asistencia / 154 / ▲ 8 %".
 *
 * doc18 §4 requires KPI numbers in Bold; they render at `text-h2` on
 * mobile and `text-h1` from desktop up, both from the type scale.
 */
export function KPICard({
  label,
  value,
  trend,
  icon,
  accent,
  loading = false,
  sparkline,
  className,
  ...props
}: KPICardProps) {
  // A KPI tile has no `onClick` of its own (doc18 §13's MetricCard is
  // read-only) — but `...props` still forwards one if a future caller ever
  // passes it, and only then does the tile earn the hover/elevation
  // `<Card interactive>` centralises. Without this check every KPI card on
  // every dashboard hovered as if it were clickable while doing nothing,
  // which is exactly the false promise `interactive` exists to prevent.
  const isInteractive = 'onClick' in props && props.onClick !== undefined;

  if (loading) {
    return (
      <Card className={cn('flex flex-col gap-3 p-6', className)} {...props}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-20" />
      </Card>
    );
  }

  return (
    <Card
      interactive={isInteractive}
      className={cn('flex flex-col gap-3 p-6', className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-small font-medium text-foreground-muted">{label}</p>
        {icon ? (
          <span className={kpiAccentVariants({ accent })}>
            <Icon icon={icon} size="sm" />
          </span>
        ) : null}
      </div>

      <p className="text-h2 font-bold leading-tight text-foreground desktop:text-h1">{value}</p>

      {trend ? <KPITrendIndicator trend={trend} /> : null}

      {sparkline ? (
        // Fixed height so the chart's own auto-measure never fights the
        // card for space, and so cards with/without a sparkline still line
        // up if they ever share a row.
        <div className="h-8 w-full" aria-hidden="true">
          {sparkline}
        </div>
      ) : null}
    </Card>
  );
}

const TREND_ICONS: Record<KPITrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

/**
 * doc18 §27 / WCAG AA: colour is never the only carrier of meaning, so the
 * direction is encoded three ways — hue, arrow glyph and the Spanish word
 * announced to screen readers.
 */
const TREND_LABELS: Record<KPITrendDirection, string> = {
  up: 'Aumento de',
  down: 'Disminución de',
  flat: 'Sin variación,',
};

const TREND_COLOURS: Record<KPITrendDirection, string> = {
  up: 'text-success-600',
  down: 'text-error-600',
  flat: 'text-foreground-muted',
};

function KPITrendIndicator({ trend }: { trend: KPITrend }) {
  return (
    <p
      className={cn(
        'flex items-center gap-1 text-small font-medium',
        TREND_COLOURS[trend.direction],
      )}
    >
      <Icon icon={TREND_ICONS[trend.direction]} size="xs" />
      <span className="sr-only">{TREND_LABELS[trend.direction]}</span>
      <span>{trend.value}</span>
    </p>
  );
}
