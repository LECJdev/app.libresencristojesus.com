'use client';

import { Home, MapPin, Network, Users } from 'lucide-react';
import { KPICard, KPIGrid } from '@lcj/ui';
import type { OrganizationSummary } from '@lcj/types';

/**
 * The four summary cards of doc06 §6 — "Distritos, Casas de Paz,
 * Liderazgos, Cobertura Nacional".
 *
 * These are structural counts, not metrics: doc06 §5 is explicit that this
 * dashboard "no es mostrar estadísticas… es mostrar la estructura". No
 * trends, no comparisons — those belong to the Dashboard of Fase 9.
 */
export function OrganizationSummaryCards({
  summary,
  loading = false,
}: {
  summary?: OrganizationSummary;
  loading?: boolean;
}) {
  return (
    <KPIGrid columns={4}>
      <KPICard
        label="Distritos"
        value={summary?.districts ?? 0}
        icon={Network}
        accent="primary"
        loading={loading}
      />
      <KPICard
        label="Casas de Paz"
        value={summary?.peaceHouses ?? 0}
        icon={Home}
        accent="primary"
        loading={loading}
      />
      <KPICard
        label="Liderazgos"
        value={summary?.leaderships ?? 0}
        icon={Users}
        // doc18 §31 assigns the institutional gold to leadership.
        accent="gold"
        loading={loading}
      />
      <KPICard
        label="Cobertura Nacional"
        value={summary?.municipalities ?? 0}
        icon={MapPin}
        accent="primary"
        loading={loading}
      />
    </KPIGrid>
  );
}
