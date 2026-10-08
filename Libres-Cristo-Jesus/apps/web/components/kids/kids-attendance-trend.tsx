'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { KidsAttendanceTrendPoint } from '@lcj/types';

/**
 * Sparkline de las últimas reuniones de una sede (`KidsSchoolMetrics.attendanceTrend`,
 * ya agregado y etiquetado por el backend — a diferencia de
 * `AttendanceRateTrend` no hay selector de granularidad: el backend entrega
 * un punto por reunión semanal, hasta 8.
 */

const CHART_COLOR = 'var(--color-chart-1)';
const GRID_COLOR = 'var(--color-chart-grid)';
const AXIS_COLOR = 'var(--color-chart-axis)';

const AXIS_PROPS = {
  stroke: AXIS_COLOR,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

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

export interface KidsAttendanceTrendProps {
  points: KidsAttendanceTrendPoint[];
}

export function KidsAttendanceTrend({ points }: KidsAttendanceTrendProps) {
  if (points.length === 0) {
    return null;
  }

  const data = points.map((point) => ({ label: point.label, rate: point.attendancePercent }));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h4 font-semibold text-foreground">Tendencia de asistencia</h2>

      <ResponsiveContainer width="100%" height={224}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="kidsAttendanceTrendGradient" x1="0" y1="0" x2="0" y2="1">
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
            fill="url(#kidsAttendanceTrendGradient)"
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
