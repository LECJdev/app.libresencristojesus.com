'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardTrendPoint } from '@lcj/types';
import { formatCurrencyCOP, formatNumber } from '@/lib/format';

/**
 * Las dos series mensuales del panel (doc11, mockup de la guía de identidad).
 *
 * ── Why these two forms ──────────────────────────────────────────────
 * Attendance is a TREND over time → a line. Offerings are a MAGNITUDE
 * compared month to month → columns. Both are single-series, which decides
 * three things at once: one hue, no legend (the card's title already names
 * what is plotted), and no categorical palette to keep colourblind-safe.
 *
 * ── Colour ───────────────────────────────────────────────────────────
 * `--color-chart-1` and nothing else. It was verified against the surface
 * it sits on in both themes — lightness band and ≥ 3:1 contrast — which is
 * why it is a token of its own rather than a reach into `--color-primary-*`:
 * a chart hue answers to a constraint a button does not.
 *
 * ── What is deliberately absent ──────────────────────────────────────
 * No value printed on every point. A number beside each dot is chaos that
 * goes unread; the axis carries the scale and the tooltip carries the
 * precise figure. No second y-axis, ever — two measures of different scale
 * are two charts, which is exactly what these are.
 */

const CHART_COLOR = 'var(--color-chart-1)';
const GRID_COLOR = 'var(--color-chart-grid)';
const AXIS_COLOR = 'var(--color-chart-axis)';

/** Shared axis styling — recessive, per the mark specs. */
const AXIS_PROPS = {
  stroke: AXIS_COLOR,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

/**
 * Compact ticks so a national total does not print "2.450.000" on the axis
 * and squeeze the plot. The tooltip still shows the exact figure.
 */
function compactCOP(value: number): string {
  if (value >= 1_000_000) {
    return `${Math.round((value / 1_000_000) * 10) / 10}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }
  return String(value);
}

/**
 * One tooltip implementation for both charts.
 *
 * Built by hand rather than styled through Recharts' props so it wears the
 * product's own surface, border and radius tokens — a chart tooltip that
 * looks like a different application is the tell of a bolted-on library.
 */
function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const value = payload[0]?.value ?? 0;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md">
      <p className="text-caption text-foreground-muted">{label}</p>
      <p className="flex items-center gap-2 text-small font-semibold text-foreground">
        {/* Identity rides a coloured mark BESIDE the text, never the text itself. */}
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: CHART_COLOR }}
        />
        {format(value)}
      </p>
    </div>
  );
}

export function AttendanceTrendChart({ data }: { data: DashboardTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          {/* Fades to fully transparent so it never competes with the
              gridlines or reads as a second, filled series — it is the
              same one line, just given a floor to stand on. */}
          <linearGradient id="attendanceAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.28} />
            <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Horizontal only: vertical rules add ink without helping read a value. */}
        <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={formatNumber} width={56} />
        <Tooltip
          cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
          content={<ChartTooltip format={(value) => `${formatNumber(value)} asistencias`} />}
        />
        <Area
          type="monotone"
          dataKey="attendance"
          stroke={CHART_COLOR}
          fill="url(#attendanceAreaGradient)"
          // 2px with round joins, and markers at ≥ 8px carrying a surface
          // ring so they stay legible where the line crosses itself.
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{ r: 4, fill: CHART_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: CHART_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OfferingsTrendChart({ data }: { data: DashboardTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          {/* Same treatment as the attendance area, translated to a bar:
              full strength at the data end, fading toward the baseline. */}
          <linearGradient id="offeringsBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={1} />
            <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={compactCOP} width={56} />
        <Tooltip
          cursor={{ fill: GRID_COLOR, fillOpacity: 0.3 }}
          content={<ChartTooltip format={formatCurrencyCOP} />}
        />
        <Bar
          dataKey="offerings"
          fill="url(#offeringsBarGradient)"
          // Capped rather than filling the band, so the leftover is air.
          maxBarSize={24}
          // Rounded at the data end, square at the baseline: the corner
          // radius marks where the value stops, not where the axis is.
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
