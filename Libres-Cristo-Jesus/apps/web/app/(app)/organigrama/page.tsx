'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronsDownUp, ChevronsUpDown, Network } from 'lucide-react';
import { Button, Container, EmptyState, PageHeader, SkeletonCard } from '@lcj/ui';
import { useOrganizationTree } from '@/hooks/use-organization-tree';
import type { DistrictNode, PeaceHouseNode, SearchHit } from '@lcj/types';
import { OrganizationSearch } from '@/components/organization/organization-search';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import {
  OrganigramaChart,
  resolveFocusDomId,
  type FocusableKind,
} from '@/components/organization/chart/organigrama-chart';
import {
  ZoomControls,
  DEFAULT_ZOOM,
  type ZoomLevel,
} from '@/components/organization/chart/zoom-controls';
import {
  StatusFilterPopover,
  type StatusFilterValue,
} from '@/components/organization/chart/status-filter-popover';

/** How long a search-selected card stays highlighted (ms). */
const HIGHLIGHT_MS = 1800;

/**
 * Organigrama — doc06 §2 (Jerarquía Oficial), §4, §6 (tarjetas resumen),
 * §7 (árbol expandible), §23 (responsive).
 *
 * A stacked-card diagram built from plain Flexbox/CSS, not a canvas/graph
 * library: Pastores Generales → Distritos → Casas de Paz → Líderes, each
 * level connected by thin decorative `border`/`div` lines. A District opens
 * as the diagram's own focus mode (still no navigation), but a Casa de Paz
 * has too much to show on a card — leaders, roster, attendance history — so
 * it navigates to its own full page instead of a cramped side Drawer.
 */
export default function OrganigramaPage() {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useOrganizationTree();

  const [zoom, setZoom] = useState<ZoomLevel>(DEFAULT_ZOOM);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [collapsedDistrictIds, setCollapsedDistrictIds] = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [focusedDistrictId, setFocusedDistrictId] = useState<string | null>(null);

  const filteredDistricts = useMemo<DistrictNode[]>(() => {
    if (!data) {
      return [];
    }
    if (statusFilter === 'all') {
      return data.districts;
    }
    return data.districts
      .filter((district) => district.status === statusFilter)
      .map((district) => ({
        ...district,
        peaceHouses: district.peaceHouses.filter(
          (peaceHouse) => peaceHouse.status === statusFilter,
        ),
      }));
  }, [data, statusFilter]);

  const focusedDistrict = useMemo<DistrictNode | null>(() => {
    if (!data || !focusedDistrictId) {
      return null;
    }
    return data.districts.find((district) => district.id === focusedDistrictId) ?? null;
  }, [data, focusedDistrictId]);

  const allExpanded = collapsedDistrictIds.size === 0;

  const handleToggleAll = useCallback(() => {
    if (!data) {
      return;
    }
    if (allExpanded) {
      setCollapsedDistrictIds(new Set(data.districts.map((district) => district.id)));
    } else {
      setCollapsedDistrictIds(new Set());
    }
  }, [data, allExpanded]);

  const handleToggleDistrict = useCallback((id: string) => {
    setCollapsedDistrictIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleOpenPeaceHouse = useCallback(
    (peaceHouse: PeaceHouseNode) => {
      router.push(`/casas-de-paz/${peaceHouse.id}`);
    },
    [router],
  );

  const handleFocusDistrict = useCallback((district: DistrictNode) => {
    setFocusedDistrictId(district.id);
  }, []);

  const handleExitFocus = useCallback(() => {
    setFocusedDistrictId(null);
  }, []);

  // doc06 §12: selecting a search hit used to centre + highlight the
  // matching node in the React Flow diagram. Without a canvas, the
  // equivalent is expanding every collapsed section (so the card is
  // guaranteed to be in the DOM), scrolling it into view and briefly
  // ringing it in gold.
  const handleSelectEntity = useCallback(
    (hit: SearchHit, kind: FocusableKind) => {
      if (!data) {
        return;
      }
      const domId = resolveFocusDomId(data, kind, hit.id);
      if (!domId) {
        return;
      }

      // A search hit can point outside the currently focused District, so
      // leaving focus mode first guarantees the target card is in the DOM.
      setFocusedDistrictId(null);
      setCollapsedDistrictIds(new Set());

      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
      }

      window.setTimeout(() => {
        document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);

      setHighlightId(domId);
      highlightTimer.current = setTimeout(() => {
        setHighlightId((current) => (current === domId ? null : current));
      }, HIGHLIGHT_MS);
    },
    [data],
  );

  return (
    <Container size="full" className="flex flex-col gap-8 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title="Organigrama"
        description="Estructura jerárquica de la iglesia"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full tablet:w-72">
              <OrganizationSearch onSelectEntity={handleSelectEntity} />
            </div>
            <ZoomControls zoom={zoom} onZoomChange={setZoom} />
            <StatusFilterPopover value={statusFilter} onChange={setStatusFilter} />
            <Button
              variant="secondary"
              leftIcon={allExpanded ? ChevronsDownUp : ChevronsUpDown}
              onClick={handleToggleAll}
            >
              {allExpanded ? 'Contraer todo' : 'Expandir todo'}
            </Button>
          </div>
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar el organigrama"
          description={error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              Reintentar
            </Button>
          }
        />
      ) : null}

      {isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {data ? (
        <div className="flex flex-col gap-4">
          {data.generalPastors.length === 0 && data.districts.length === 0 ? (
            <EmptyState
              icon={Network}
              title="Todavía no hay estructura registrada"
              description="Cuando se registre el primer Pastor General o Distrito, el organigrama aparecerá aquí."
            />
          ) : (
            <OrganigramaChart
              tree={data}
              districts={filteredDistricts}
              zoom={zoom}
              collapsedDistrictIds={collapsedDistrictIds}
              onToggleDistrict={handleToggleDistrict}
              highlightId={highlightId}
              focusedDistrict={focusedDistrict}
              onFocusDistrict={handleFocusDistrict}
              onExitFocus={handleExitFocus}
              onOpenPeaceHouse={handleOpenPeaceHouse}
            />
          )}
        </div>
      ) : null}
    </Container>
  );
}
