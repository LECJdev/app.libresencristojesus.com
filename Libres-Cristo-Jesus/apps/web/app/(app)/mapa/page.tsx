'use client';

import dynamic from 'next/dynamic';
import { AlertTriangle, MapPin } from 'lucide-react';
import { Badge, Card, Container, EmptyState, Loading, PageHeader } from '@lcj/ui';
import { useMapStats } from '@/hooks/use-dashboard';
import { formatNumber } from '@/lib/format';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Mapa nacional de Casas de Paz (doc11 RN-1103).
 *
 * `ssr: false` is not a preference — Leaflet reads `window` at import time,
 * so evaluating it during the server render crashes the route. The loading
 * placeholder keeps the box the same height the map will occupy, so the page
 * does not jump when it arrives (doc18 §20).
 */
const ClusterMap = dynamic(() => import('@/components/dashboard/cluster-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loading label="Cargando el mapa…" lines={3} />
    </div>
  ),
});

export default function MapaPage() {
  const { data, isPending, isError, error } = useMapStats();

  const points = data?.points ?? [];
  const unlocated = data?.unlocated ?? 0;

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Mapa nacional"
        description="Casas de Paz ubicadas en el territorio, agrupadas por cercanía."
        actions={data ? <Badge variant="info">{formatNumber(points.length)} ubicadas</Badge> : null}
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar el mapa"
          description={error.message}
        />
      ) : isPending ? (
        <Loading label="Consultando las Casas de Paz…" lines={6} />
      ) : points.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Todavía no hay Casas de Paz ubicables"
          description="El mapa dibuja las Casas de Paz que tienen coordenadas. Ejecute la geocodificación del catálogo (pnpm db:geocode:geo) o registre la ubicación de cada casa."
        />
      ) : (
        <Card className="h-[32rem] overflow-hidden p-0">
          <ClusterMap points={points} />
        </Card>
      )}

      {/*
        Said out loud, never hidden. A map showing 27 of 114 houses without
        mentioning the other 87 invites exactly the wrong conclusion — that
        those places have no Casas de Paz, rather than no coordinates.
      */}
      {unlocated > 0 ? (
        <p
          role="status"
          className="rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-small text-warning-700"
        >
          {formatNumber(unlocated)}{' '}
          {unlocated === 1 ? 'Casa de Paz no aparece' : 'Casas de Paz no aparecen'} en el mapa
          porque aún no tienen coordenadas. No significa que no existan: falta ubicar su municipio o
          registrar su dirección exacta.
        </p>
      ) : null}
    </Container>
  );
}
