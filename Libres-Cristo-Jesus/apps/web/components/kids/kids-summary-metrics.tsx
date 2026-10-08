'use client';

import { Baby, CalendarCheck, Network, ShieldAlert } from 'lucide-react';
import { Grid, GridItem, KPICard } from '@lcj/ui';
import type { KidsAttendanceTrendPoint, KidsSchoolMetrics } from '@lcj/types';
import { KidsAttendanceTrend } from '@/components/kids/kids-attendance-trend';

/**
 * Resumen agregado de TODAS las sedes de Escuela Kids, para la ruta `/kids`
 * — mismo lugar visual que el `KpiRow` + gráfico de tendencia del dashboard
 * general (`apps/web/app/(app)/dashboard/page.tsx`), pero acotado 100% a
 * datos de Kids. No reutiliza ni edita nada de `components/dashboard/`: es
 * su propia pieza, con su propia agregación client-side de lo que cada sede
 * ya expone por `GET /kids/schools/:id/metrics` (no hay endpoint de resumen
 * en el backend, y con el tamaño actual del módulo no hace falta uno).
 */

export interface KidsSummaryMetricsProps {
  metricsBySchool: (KidsSchoolMetrics | undefined)[];
  schoolCount: number;
  loading: boolean;
}

/**
 * Promedia el % de asistencia semana a semana entre sedes, agrupando por
 * `isoYear`/`isoWeek` en vez de por posición en el arreglo — así una sede
 * con menos historial (o una semana sin reunión) no desalinea el resto.
 * Es un promedio simple entre sedes (no ponderado por cantidad de niños)
 * porque `KidsSchoolMetrics.attendanceTrend` solo trae el porcentaje ya
 * calculado por el backend, no los conteos crudos por punto — suficiente
 * para un módulo de 2 sedes; si el módulo crece, ponderar por tamaño de
 * sede sería el siguiente paso natural.
 */
function mergeAttendanceTrends(
  metricsBySchool: (KidsSchoolMetrics | undefined)[],
): KidsAttendanceTrendPoint[] {
  const byWeek = new Map<string, { isoYear: number; isoWeek: number; label: string; sum: number; count: number }>();

  for (const metrics of metricsBySchool) {
    if (!metrics) {
      continue;
    }
    for (const point of metrics.attendanceTrend) {
      const key = `${point.isoYear}-${point.isoWeek}`;
      const existing = byWeek.get(key);
      if (existing) {
        existing.sum += point.attendancePercent;
        existing.count += 1;
      } else {
        byWeek.set(key, {
          isoYear: point.isoYear,
          isoWeek: point.isoWeek,
          label: point.label,
          sum: point.attendancePercent,
          count: 1,
        });
      }
    }
  }

  return Array.from(byWeek.values())
    .sort((a, b) => a.isoYear - b.isoYear || a.isoWeek - b.isoWeek)
    .map((entry) => ({
      isoYear: entry.isoYear,
      isoWeek: entry.isoWeek,
      label: entry.label,
      attendancePercent: Math.round(entry.sum / entry.count),
    }));
}

export function KidsSummaryMetrics({ metricsBySchool, schoolCount, loading }: KidsSummaryMetricsProps) {
  const resolved = metricsBySchool.filter((metrics): metrics is KidsSchoolMetrics => metrics !== undefined);

  const totalChildren = resolved.reduce((sum, metrics) => sum + metrics.totalChildren, 0);
  const pendingConsents = resolved.reduce((sum, metrics) => sum + metrics.pendingConsents, 0);
  const averageAttendance =
    resolved.length > 0
      ? Math.round(resolved.reduce((sum, metrics) => sum + metrics.averageAttendance, 0) / resolved.length)
      : 0;

  const trend = mergeAttendanceTrends(metricsBySchool);

  return (
    <div className="flex flex-col gap-6">
      <Grid>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard label="Sedes activas" icon={Network} loading={loading} value={String(schoolCount)} />
        </GridItem>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label="Niños activos"
            icon={Baby}
            loading={loading}
            value={loading ? '—' : String(totalChildren)}
          />
        </GridItem>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label="Asistencia promedio"
            icon={CalendarCheck}
            loading={loading}
            value={loading ? '—' : `${averageAttendance}%`}
          />
        </GridItem>
        <GridItem cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
          <KPICard
            label="Autorizaciones pendientes"
            icon={ShieldAlert}
            loading={loading}
            value={loading ? '—' : String(pendingConsents)}
          />
        </GridItem>
      </Grid>

      {!loading && trend.length > 0 ? <KidsAttendanceTrend points={trend} /> : null}
    </div>
  );
}
