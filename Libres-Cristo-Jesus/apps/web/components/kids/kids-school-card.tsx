'use client';

import { Baby, Eye, Pencil } from 'lucide-react';
import { DomainCard, EntityStatusBadge, Icon, IconButton } from '@lcj/ui';
import type { KidsSchool } from '@lcj/types';
import { toEntityStatus } from '@/components/organization/mappers';

/**
 * Non-interactive at the root, on purpose (doc18 §27): "Ver"/"Editar" are
 * separate `IconButton`s in the footer strip rather than a card-level
 * `onClick`, same convention as `PeaceHouseListCard` — a clickable container
 * must never nest another interactive element inside it.
 */
export interface KidsSchoolCardProps {
  school: KidsSchool;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
}

export function KidsSchoolCard({ school, canManage, onView, onEdit }: KidsSchoolCardProps) {
  return (
    <DomainCard>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <Icon icon={Baby} size="sm" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-body font-semibold text-foreground">{school.name}</h3>
        </div>
        <EntityStatusBadge status={toEntityStatus(school.status)} />
      </div>

      <div className="flex justify-end gap-1 border-t border-border pt-3">
        <IconButton icon={Eye} aria-label={`Ver ${school.name}`} variant="ghost" size="sm" onClick={onView} />
        {canManage ? (
          <IconButton
            icon={Pencil}
            aria-label={`Editar ${school.name}`}
            variant="ghost"
            size="sm"
            onClick={onEdit}
          />
        ) : null}
      </div>
    </DomainCard>
  );
}
