'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

/**
 * KpiSparkline — the tiny trend line inside a `<KPICard>`.
 *
 * Deliberately not `<AttendanceTrendChart>` shrunk down: a sparkline has no
 * axis, no grid and no tooltip by definition (doc18's KPI card already
 * states the current figure and the month-over-month trend as text — this
 * is a supporting glance, not a second chart to read). Recharts is only
 * ever imported here, in `apps/web`, never inside `@lcj/ui`'s `KPICard`,
 * which stays chart-library-agnostic and takes the sparkline as a plain
 * `ReactNode` slot.
 *
 * Real data only: the caller (`KpiRow`) passes a series exclusively when
 * `/dashboard/trends` already has one for that KPI. No series is invented
 * for KPIs the API does not track over time.
 */
const CHART_COLOR = 'var(--color-chart-1)';

export function KpiSparkline({ data }: { data: number[] }) {
  const points = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
