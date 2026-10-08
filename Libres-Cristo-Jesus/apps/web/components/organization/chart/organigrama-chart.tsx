'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState, Icon, OrganizationCard, cn } from '@lcj/ui';
import type { DistrictNode, OrganizationTree, PeaceHouseNode } from '@lcj/types';
import { toEntityStatus } from '../mappers';
import { deriveDistrictCity, countDistrictLeaders } from './derive';
import { useResolvedCardLeaders } from '../use-resolved-photo';
import { ConnectorBar, ConnectorStub } from './connector';
import { GeneralPastorsCard } from './general-pastors-card';
import { PeaceHouseChartCard } from './peace-house-card';
import type { ZoomLevel } from './zoom-controls';

/**
 * The organigrama's own DOM ids — Distrito/Casa de Paz cards each get a
 * stable, predictable id so `OrganizationSearch`'s "select a hit" can
 * `scrollIntoView` + briefly highlight the right card, replacing the old
 * React Flow diagram's "centre and focus a node" without a canvas.
 */
export const districtDomId = (id: string) => `district-${id}`;
export const peaceHouseDomId = (id: string) => `peace-house-${id}`;

export type FocusableKind = 'districts' | 'peaceHouses' | 'leaderships';

/**
 * `OrganizationSearch` hit ids are District/PeaceHouse/LeadershipUnit ids —
 * this walks the already-loaded tree to translate one into the DOM id of
 * the card that represents it, so the page can `scrollIntoView` + highlight
 * it. A Leadership Unit has no card of its own — its members are shown
 * inline on the parent card (Distrito or Casa de Paz) — so it always
 * resolves to that parent card instead.
 */
export function resolveFocusDomId(
  tree: OrganizationTree,
  kind: FocusableKind,
  id: string,
): string | null {
  if (kind === 'districts') {
    return tree.districts.some((district) => district.id === id) ? districtDomId(id) : null;
  }

  if (kind === 'peaceHouses') {
    const found = tree.districts.some((district) =>
      district.peaceHouses.some((peaceHouse) => peaceHouse.id === id),
    );
    return found ? peaceHouseDomId(id) : null;
  }

  // kind === 'leaderships'
  if (tree.generalPastors.some((pastor) => pastor.id === id)) {
    return 'general-pastors-card';
  }
  for (const district of tree.districts) {
    if (district.leadership?.id === id) {
      return districtDomId(district.id);
    }
    for (const peaceHouse of district.peaceHouses) {
      if (peaceHouse.leadership?.id === id) {
        return peaceHouseDomId(peaceHouse.id);
      }
    }
  }
  return null;
}

const ENTRANCE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function EntranceItem({ children, index }: { children: ReactNode; index: number }) {
  return (
    <motion.div
      initial={ENTRANCE.initial}
      animate={ENTRANCE.animate}
      transition={{ duration: 0.18, delay: Math.min(index, 8) * 0.03 }}
    >
      {children}
    </motion.div>
  );
}

function DisclosureButton({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        'mx-auto flex items-center gap-1 rounded-md border border-border px-3 py-1.5',
        'text-caption text-foreground-muted transition-colors duration-fast hover:bg-surface-muted',
        'tablet:hidden',
      )}
    >
      <Icon icon={open ? ChevronDown : ChevronRight} size="xs" />
      {label}
    </button>
  );
}

export interface OrganigramaChartProps {
  tree: OrganizationTree;
  /** `tree.districts` already narrowed by the Estado filter. */
  districts: DistrictNode[];
  zoom: ZoomLevel;
  collapsedDistrictIds: ReadonlySet<string>;
  onToggleDistrict: (id: string) => void;
  /** DOM id of the card currently highlighted from a search selection. */
  highlightId: string | null;
  /** When set, the diagram shows only this District (as the head) and its own Casas de Paz. */
  focusedDistrict: DistrictNode | null;
  onFocusDistrict: (district: DistrictNode) => void;
  onExitFocus: () => void;
  onOpenPeaceHouse: (peaceHouse: PeaceHouseNode) => void;
}

export function OrganigramaChart({
  tree,
  districts,
  zoom,
  collapsedDistrictIds,
  onToggleDistrict,
  highlightId,
  focusedDistrict,
  onFocusDistrict,
  onExitFocus,
  onOpenPeaceHouse,
}: OrganigramaChartProps) {
  return (
    <div className="overflow-x-auto overflow-y-visible pb-4">
      <div
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        className="flex flex-col items-center gap-0 transition-transform duration-base"
      >
        {focusedDistrict ? (
          <div className="mb-4 w-full max-w-3xl">
            <button
              type="button"
              onClick={onExitFocus}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-small font-medium text-primary-700 transition-colors duration-fast hover:bg-surface-muted"
            >
              <Icon icon={ArrowLeft} size="sm" />
              Ver todos los distritos
            </button>
          </div>
        ) : (
          <div className="w-full max-w-3xl">
            <GeneralPastorsCard generalPastors={tree.generalPastors} summary={tree.summary} />
          </div>
        )}

        {focusedDistrict ? (
          <DistrictColumn
            district={focusedDistrict}
            collapsed={collapsedDistrictIds.has(focusedDistrict.id)}
            highlightId={highlightId}
            onToggle={() => {
              onToggleDistrict(focusedDistrict.id);
            }}
            onFocusDistrict={onFocusDistrict}
            onOpenPeaceHouse={onOpenPeaceHouse}
            isHead
          />
        ) : districts.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Ningún distrito coincide con el filtro"
              description="Cambie el filtro de estado para ver más resultados."
            />
          </div>
        ) : (
          <>
            <ConnectorStub size="lg" />
            <ConnectorBar className="flex w-full flex-nowrap justify-start gap-6">
              <AnimatePresence>
                {districts.map((district, index) => (
                  <EntranceItem key={district.id} index={index}>
                    <DistrictColumn
                      district={district}
                      collapsed={collapsedDistrictIds.has(district.id)}
                      highlightId={highlightId}
                      onToggle={() => {
                        onToggleDistrict(district.id);
                      }}
                      onFocusDistrict={onFocusDistrict}
                      onOpenPeaceHouse={onOpenPeaceHouse}
                    />
                  </EntranceItem>
                ))}
              </AnimatePresence>
            </ConnectorBar>
          </>
        )}
      </div>
    </div>
  );
}

function DistrictColumn({
  district,
  collapsed,
  highlightId,
  onToggle,
  onFocusDistrict,
  onOpenPeaceHouse,
  isHead = false,
}: {
  district: DistrictNode;
  collapsed: boolean;
  highlightId: string | null;
  onToggle: () => void;
  onFocusDistrict: (district: DistrictNode) => void;
  onOpenPeaceHouse: (peaceHouse: PeaceHouseNode) => void;
  /** Rendered as the diagram's top node (focus mode) — no incoming connector, not clickable into itself. */
  isHead?: boolean;
}) {
  const domId = districtDomId(district.id);
  const city = deriveDistrictCity(district);
  const leaderCount = countDistrictLeaders(district);
  const hasPeaceHouses = district.peaceHouses.length > 0;
  const leaders = useResolvedCardLeaders(district.leadership, true);

  return (
    <div className="flex flex-col items-center gap-0">
      {isHead ? null : <ConnectorStub size="sm" />}

      <OrganizationCard
        id={domId}
        name={district.name}
        type={`Distrito D${district.number}`}
        leaders={leaders}
        leadersAvatarClassName="size-[58px]"
        location={city ?? undefined}
        status={toEntityStatus(district.status)}
        metrics={[
          { label: 'Casas de Paz', value: district.peaceHouseCount },
          { label: 'Líderes', value: leaderCount },
        ]}
        onClick={
          isHead
            ? undefined
            : () => {
                onFocusDistrict(district);
              }
        }
        className={cn('w-80 min-h-[210px]', highlightId === domId && 'ring-2 ring-gold-500')}
      />

      {hasPeaceHouses ? (
        <>
          <div className="mt-2">
            <DisclosureButton
              open={!collapsed}
              onClick={onToggle}
              label={`${collapsed ? 'Ver' : 'Ocultar'} Casas de Paz (${district.peaceHouses.length})`}
            />
          </div>

          {!collapsed ? (
            <>
              <ConnectorStub size="sm" />
              <ConnectorBar className="flex flex-wrap justify-center gap-4">
                <AnimatePresence>
                  {district.peaceHouses.map((peaceHouse, index) => (
                    <EntranceItem key={peaceHouse.id} index={index}>
                      <PeaceHouseColumn
                        peaceHouse={peaceHouse}
                        highlightId={highlightId}
                        onOpenPeaceHouse={onOpenPeaceHouse}
                      />
                    </EntranceItem>
                  ))}
                </AnimatePresence>
              </ConnectorBar>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PeaceHouseColumn({
  peaceHouse,
  highlightId,
  onOpenPeaceHouse,
}: {
  peaceHouse: PeaceHouseNode;
  highlightId: string | null;
  onOpenPeaceHouse: (peaceHouse: PeaceHouseNode) => void;
}) {
  const domId = peaceHouseDomId(peaceHouse.id);

  return (
    <div className="flex flex-col items-center gap-0">
      <ConnectorStub size="sm" />

      <PeaceHouseChartCard
        id={domId}
        peaceHouse={peaceHouse}
        onClick={() => {
          onOpenPeaceHouse(peaceHouse);
        }}
        className={cn(highlightId === domId && 'ring-2 ring-gold-500')}
      />
    </div>
  );
}
