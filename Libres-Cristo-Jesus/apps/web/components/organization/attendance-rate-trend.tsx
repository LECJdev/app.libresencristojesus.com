'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@lcj/ui';

/**
 * Tendencia de asistencia, con selector de rango semana/mes/año (a la manera
 * de Google Trends). Sirve a dos pantallas — el detalle de una Casa de Paz
 * (`rate` = % de presentes esa semana) y el detalle de una Persona (`rate` =
 * 100/0 según asistió o no) — porque promediar una serie de 100/0 por
 * semana/mes/año da exactamente "% de reuniones a las que asistió", el
 * mismo cálculo sin cambiar una línea de la agregación.
 *
 * Visualmente clona `apps/web/components/dashboard/trend-charts.tsx` →
 * `AttendanceTrendChart` (mismos tokens, mismo tooltip a mano, misma área
 * con degradado) pero vive aparte porque esa opera sobre la agregación
 * mensual del dashboard general (`DashboardTrendPoint`), mientras esta
 * agrega, en el cliente, filas crudas por reunión.
 */

export type TrendGranularity = 'week' | 'month' | 'year';

export interface AttendanceTrendRow {
  meetingDate: string;
  rate: number;
}

interface TrendPoint {
  label: string;
  rate: number;
}

const CHART_COLOR = 'var(--color-chart-1)';
const GRID_COLOR = 'var(--color-chart-grid)';
const AXIS_COLOR = 'var(--color-chart-axis)';

const AXIS_PROPS = {
  stroke: AXIS_COLOR,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

const weekLabelFormatter = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });
const monthLabelFormatter = new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' });

function average(values: number[]): number {
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * `roster` (para una Casa de Paz) es el conteo ACTUAL de gente activa, el
 * mismo valor en todas las filas semanales — sumar `present` entre semanas
 * y dividir por el roster de una sola semana pasaría de 100%. Promediar la
 * `rate` ya calculada de cada semana es lo correcto tanto para "asistencia
 * promedio de ese mes/año" de una casa como para "% de reuniones asistidas"
 * de una persona.
 */
export function buildTrendPoints(
  rows: AttendanceTrendRow[],
  granularity: TrendGranularity,
): TrendPoint[] {
  const chronological = [...rows].sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));

  if (granularity === 'week') {
    return chronological.map((row) => ({
      label: weekLabelFormatter.format(new Date(row.meetingDate)),
      rate: row.rate,
    }));
  }

  const bucketKey = (meetingDate: string) =>
    granularity === 'month' ? meetingDate.slice(0, 7) : meetingDate.slice(0, 4);

  const buckets = new Map<string, number[]>();
  for (const row of chronological) {
    const key = bucketKey(row.meetingDate);
    const rates = buckets.get(key) ?? [];
    rates.push(row.rate);
    buckets.set(key, rates);
  }

  return Array.from(buckets.entries()).map(([key, rates]) => ({
    label: granularity === 'month' ? monthLabelFormatter.format(new Date(`${key}-01`)) : key,
    rate: average(rates),
  }));
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const value = payload[0]?.value ?? 0;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-md">
      <p className="text-caption text-foreground-muted">{label}</p>
      <p className="flex items-center gap-2 text-small font-semibold text-foreground">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: CHART_COLOR }}
        />
        {value}% de asistencia
      </p>
    </div>
  );
}

const GRANULARITY_LABELS: Record<TrendGranularity, string> = {
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

export interface AttendanceRateTrendProps {
  rows: AttendanceTrendRow[];
}

export function AttendanceRateTrend({ rows }: AttendanceRateTrendProps) {
  const [granularity, setGranularity] = useState<TrendGranularity>('week');
  const points = useMemo(() => buildTrendPoints(rows, granularity), [rows, granularity]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h4 font-semibold text-foreground">Tendencia de asistencia</h2>
        <div className="flex gap-2">
          {(Object.keys(GRANULARITY_LABELS) as TrendGranularity[]).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={granularity === option ? 'primary' : 'ghost'}
              onClick={() => {
                setGranularity(option);
              }}
            >
              {GRANULARITY_LABELS[option]}
            </Button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={256}>
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="attendanceRateTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.28} />
              <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis
            {...AXIS_PROPS}
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            width={44}
          />
          <Tooltip cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }} content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={CHART_COLOR}
            fill="url(#attendanceRateTrendGradient)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: CHART_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: CHART_COLOR, stroke: 'var(--color-surface)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
