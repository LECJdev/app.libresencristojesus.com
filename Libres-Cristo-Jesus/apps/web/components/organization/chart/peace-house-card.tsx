'use client';

import { MapPin, Users } from 'lucide-react';
import { DomainCard, DomainCardMeta, EntityStatusBadge, LeadersRow, cn } from '@lcj/ui';
import type { PeaceHouseNode } from '@lcj/types';
import { toEntityStatus } from '../mappers';
import { usePeople } from '@/hooks/use-people';
import { useResolvedCardLeaders } from '../use-resolved-photo';

/**
 * A Casa de Paz tile for the chart. Deliberately NOT the `@lcj/ui`
 * `PeaceHouseCard`: that one has a single fixed metric slot hard-labelled
 * "Asistencia promedio", and this card needs to show a headcount instead —
 * a different figure with a different meaning. Composed from the same
 * primitives (`DomainCard`/`DomainCardMeta`/`LeadersRow`/`EntityStatusBadge`)
 * that `PeaceHouseCard` itself is built from, rather than duplicating its
 * whole shell.
 *
 * The headcount is fetched here, per card, via the EXISTING `usePeople`
 * hook (unmodified) filtered by `peaceHouseId` — legitimate because the
 * tree gives no person count anywhere and the church currently plans a
 * small number of Casas de Paz (per the project owner's own sizing call).
 * No "% asistencia" is shown: no hook in this codebase exposes that figure
 * per Casa de Paz, and a fabricated 0 % would be worse than omitting it.
 */
export interface PeaceHouseChartCardProps {
  id: string;
  peaceHouse: PeaceHouseNode;
  onClick?: () => void;
  className?: string;
}

export function PeaceHouseChartCard({
  id,
  peaceHouse,
  onClick,
  className,
}: PeaceHouseChartCardProps) {
  const { data } = usePeople({ peaceHouseId: peaceHouse.id, pageSize: 1 });
  const personCount = data?.meta.total;
  const leaders = useResolvedCardLeaders(peaceHouse.leadership, true);

  return (
    <DomainCard id={id} onClick={onClick} className={cn('w-64 gap-2 p-3', className)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-h4 font-semibold text-foreground">{peaceHouse.name}</p>
          {peaceHouse.code ? (
            <p className="truncate text-caption text-foreground-muted">{peaceHouse.code}</p>
          ) : null}
        </div>
        <EntityStatusBadge status={toEntityStatus(peaceHouse.status)} />
      </div>

      {peaceHouse.neighborhood ? (
        <DomainCardMeta icon={MapPin} label="Barrio">
          {peaceHouse.neighborhood}
        </DomainCardMeta>
      ) : null}

      {leaders ? <LeadersRow leaders={leaders} avatarClassName="size-[58px]" /> : null}

      {personCount !== undefined ? (
        <DomainCardMeta icon={Users} label="Personas">
          {personCount}
        </DomainCardMeta>
      ) : null}
    </DomainCard>
  );
}
