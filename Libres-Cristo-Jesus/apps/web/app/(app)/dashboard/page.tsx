'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AlertTriangle, ArrowRight, MapPin } from 'lucide-react';
import {
  Badge,
  Button,
  ChartCard,
  Container,
  EmptyState,
  Grid,
  GridItem,
  PageHeader,
} from '@lcj/ui';
import { RoleName } from '@lcj/types';
import { useDashboardSummary, useDashboardTrends } from '@/hooks/use-dashboard';
import { useSessionStore } from '@/store/session-store';
import { KpiRow } from '@/components/dashboard/kpi-row';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Recharts is heavy — it was the whole reason this route shipped 118 kB of
 * JavaScript. Loading it separately lets the KPI row, which is the part
 * anyone actually opens the dashboard for, paint without waiting on a
 * charting library.
 *
 * `ssr: false` because a chart has nothing to contribute to a server render:
 * it measures its own container to size itself, so the server can only emit
 * an empty box that the client immediately replaces.
 *
 * No `loading` placeholder here — `<ChartCard>` already owns a fixed-height
 * skeleton and it is driven by the query's own pending state, so the box
 * never changes size and the page never reflows.
 */
const AttendanceTrendChart = dynamic(
  () => import('@/components/dashboard/trend-charts').then((m) => m.AttendanceTrendChart),
  { ssr: false },
);

const OfferingsTrendChart = dynamic(
  () => import('@/components/dashboard/trend-charts').then((m) => m.OfferingsTrendChart),
  { ssr: false },
);

/**
 * Dashboard — doc17: "cada usuario verá un Dashboard diferente según su rol".
 *
 * ── How the four dashboards actually differ ──────────────────────────
 * NOT by rendering four different screens. The indicators are the same four
 * questions for everyone — how many people came, how much was offered, how
 * many houses are active, how many meetings this week — and what changes is
 * the ANSWER, because the server scopes every query by role (RN-1302). A
 * Líder sees their Casa de Paz in these cards; a Pastor General sees the
 * country. `scopeLabel` says which, out loud, so nobody misreads a district
 * total as a national one.
 *
 * What genuinely differs per role is the SHORTCUTS: a Líder lands here to
 * register a meeting, a pastor to supervise. That is the part that branches.
 *
 * Four near-identical screens would have been the literal reading of doc17
 * and the wrong one — they would drift apart, and three of them would be
 * discovered broken months later because nobody with that role opened them.
 */

const TREND_MONTHS = 12;

/** Where each role most likely wants to go from here. */
const SHORTCUTS_BY_ROLE: Record<RoleName, { href: string; label: string }[]> = {
  [RoleName.ADMIN]: [
    { href: '/organigrama', label: 'Organigrama' },
    { href: '/reportes', label: 'Reportes' },
    { href: '/configuracion', label: 'Configuración' },
  ],
  [RoleName.GENERAL_PASTOR]: [
    { href: '/organigrama', label: 'Organigrama' },
    { href: '/distritos', label: 'Distritos' },
    { href: '/reportes', label: 'Reportes' },
  ],
  [RoleName.DISTRICT_PASTOR]: [
    { href: '/casas-de-paz', label: 'Casas de Paz' },
    { href: '/lideres', label: 'Líderes' },
    { href: '/reportes', label: 'Reportes' },
  ],
  [RoleName.LEADER]: [
    { href: '/reuniones', label: 'Registrar la reunión' },
    { href: '/personas', label: 'Personas' },
    { href: '/ofrendas', label: 'Ofrendas' },
  ],
  // Escuela Kids (módulo independiente): placeholder mínimo hasta que su
  // propio frontend (fase aparte) tenga un dashboard real que reemplace
  // esta pantalla genérica para ambos roles.
  [RoleName.KIDS_LEADER]: [{ href: '/kids/attendance', label: 'Asistencia Escuela Kids' }],
  [RoleName.KIDS_ASSISTANT]: [{ href: '/kids/attendance', label: 'Asistencia Escuela Kids' }],
};

export default function DashboardPage() {
  const user = useSessionStore((state) => state.user);

  const summaryQuery = useDashboardSummary();
  const trendsQuery = useDashboardTrends(TREND_MONTHS);

  const months = trendsQuery.data?.months ?? [];
  // "No data" is every month reading zero, not an empty array: the API
  // always returns the full window so the axis keeps its shape.
  const hasAttendance = months.some((month) => month.attendance > 0);
  const hasOfferings = months.some((month) => month.offerings > 0);

  const shortcuts = user ? SHORTCUTS_BY_ROLE[user.role] : [];

  if (summaryQuery.isError) {
    return (
      <Container size="lg" className="flex flex-col gap-6 pb-8">
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar los indicadores"
          description={summaryQuery.error.message}
        />
      </Container>
    );
  }

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title={user ? `Hola, ${user.username}` : 'Panel'}
        description="Indicadores de su alcance, calculados automáticamente."
        actions={
          summaryQuery.data ? (
            <Badge variant="info" aria-label="Alcance de las cifras">
              {summaryQuery.data.scopeLabel}
            </Badge>
          ) : null
        }
      />

      <KpiRow summary={summaryQuery.data} loading={summaryQuery.isPending} months={months} />

      <Grid>
        <GridItem cols={{ mobile: 4, tablet: 8, desktop: 6 }}>
          <ChartCard
            title="Asistencia mensual"
            description={`Asistencias registradas en los últimos ${TREND_MONTHS} meses.`}
            loading={trendsQuery.isPending}
            isEmpty={!hasAttendance}
            emptyMessage="Aún no hay asistencias registradas en este período."
          >
            <AttendanceTrendChart data={months} />
          </ChartCard>
        </GridItem>

        <GridItem cols={{ mobile: 4, tablet: 8, desktop: 6 }}>
          <ChartCard
            title="Ofrendas mensuales"
            description={`Total recogido por mes, en COP, en los últimos ${TREND_MONTHS} meses.`}
            loading={trendsQuery.isPending}
            isEmpty={!hasOfferings}
            emptyMessage="Aún no hay ofrendas registradas en este período."
          >
            <OfferingsTrendChart data={months} />
          </ChartCard>
        </GridItem>
      </Grid>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" leftIcon={MapPin}>
          <Link href="/mapa">Ver el mapa nacional</Link>
        </Button>
        {shortcuts.map((shortcut) => (
          <Button key={shortcut.href} asChild variant="ghost" rightIcon={ArrowRight}>
            <Link href={shortcut.href}>{shortcut.label}</Link>
          </Button>
        ))}
      </div>
    </Container>
  );
}
