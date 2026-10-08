'use client';

import { CalendarCheck, Coins, Home, UsersRound } from 'lucide-react';
import { Grid, GridItem, KPICard, type KPITrend } from '@lcj/ui';
import type { DashboardKpi, DashboardSummary, DashboardTrendPoint } from '@lcj/types';
import { formatCurrencyCOP, formatNumber } from '@/lib/format';
import { KpiSparkline } from '@/components/dashboard/kpi-sparkline';

/**
 * Los cuatro indicadores del panel, en la fila que abre la pantalla.
 *
 * A KPI row and not a grouped bar chart: these are four unrelated headline
 * numbers in four different units (people, pesos, houses, meetings). Putting
 * them on one axis would invite a comparison that means nothing.
 */

/**
 * Turns the API's signed percentage into the card's trend.
 *
 * `null` — the server's answer when the previous period was zero — renders
 * NO trend at all. It deliberately does not become "+100 %" or "—0 %":
 * growing from nothing has no percentage, and inventing one puts a figure on
 * screen that nobody can act on.
 */
function toTrend(kpi: DashboardKpi): KPITrend | undefined {
  if (kpi.changePercent === null) {
    return undefined;
  }

  const direction = kpi.changePercent > 0 ? 'up' : kpi.changePercent < 0 ? 'down' : 'flat';
  const sign = kpi.changePercent > 0 ? '+' : '';

  return { direction, value: `${sign}${kpi.changePercent} % vs mes anterior` };
}

export function KpiRow({
  summary,
  loading,
  months,
}: {
  summary: DashboardSummary | undefined;
  loading: boolean;
  /**
   * Same 12-month series already fetched for the trend charts below
   * (`useDashboardTrends`, doc11) — reused here, not re-requested. Only the
   * "Asistentes" and "Ofrendas" KPIs have a matching monthly series in that
   * payload, so only those two cards get a sparkline; "Casas de Paz
   * activas" and "Reuniones esta semana" have no time series in the API and
   * intentionally render without one rather than fake one.
   */
  months?: DashboardTrendPoint[];
}) {
  const attendanceSeries = months?.map((month) => month.attendance);
  const offeringsSeries = months?.map((month) => month.offerings);

  const cards = [
    {
      label: 'Asistentes este mes',
      icon: UsersRound,
      kpi: summary?.attendees,
      format: formatNumber,
      sparklineData: attendanceSeries,
    },
    {
      label: 'Ofrendas este mes',
      icon: Coins,
      kpi: summary?.offerings,
      format: formatCurrencyCOP,
      sparklineData: offeringsSeries,
    },
    {
      label: 'Casas de Paz activas',
      icon: Home,
      kpi: summary?.activePeaceHouses,
      format: formatNumber,
      sparklineData: undefined,
    },
    {
      label: 'Reuniones esta semana',
      icon: CalendarCheck,
      kpi: summary?.meetingsThisWeek,
      format: formatNumber,
      sparklineData: undefined,
    },
  ];

  return (
    <Grid>
      {cards.map((card) => (
        <GridItem key={card.label} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label={card.label}
            icon={card.icon}
            loading={loading}
            value={card.kpi ? card.format(card.kpi.current) : '—'}
            trend={card.kpi ? toTrend(card.kpi) : undefined}
            sparkline={
              card.sparklineData && card.sparklineData.length > 1 ? (
                <KpiSparkline data={card.sparklineData} />
              ) : undefined
            }
          />
        </GridItem>
      ))}
    </Grid>
  );
}
