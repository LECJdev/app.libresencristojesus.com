'use client';

import { House, Mail, Phone, User, type LucideIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { DomainCard, DomainCardMeta } from './domain-card';
import { LeadersRow, type CardLeader } from './leaders';
import { EntityStatusBadge, type EntityStatus } from './status-badge';

export interface LeaderCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> {
  /** The couple, at most two — leadership is modelled as a pair (doc06 §3). */
  leaders: CardLeader[];
  /** Shared login handle: one account per couple, never per person. */
  username: string;
  /**
   * What this couple leads, already resolved by the caller — a Casa de Paz
   * for a Líder, a Distrito for a Pastor Distrito. `undefined` renders as
   * "Sin asignar".
   */
  assignmentName?: string;
  /** Label for the row above, e.g. "Casa de Paz" or "Distrito". */
  assignmentLabel?: string;
  assignmentIcon?: LucideIcon;
  /** First phone found among the couple's members, already resolved by the caller. */
  phone?: string;
  /** First email found among the couple's members, already resolved by the caller. */
  email?: string;
  status?: EntityStatus;
  onClick?: () => void;
  /**
   * Row of per-card controls (editar/eliminar…), rendered as a footer strip
   * — same slot convention as `OrganizationCard`/`PersonCard`, so a
   * table→card conversion never drops the row actions it used to offer.
   */
  actions?: ReactNode;
}

/**
 * LeaderCard — presentational tile for a Líder `LeadershipUnit` (doc06 §3).
 *
 * Deliberately NOT `OrganizationCard`: that card represents an
 * organisational unit that *has* leaders (a Distrito, a Casa de Paz), while
 * here the couple itself is the primary entity — so the leaders are the
 * card's headline via `LeadersRow`, not a secondary row underneath a name.
 */
export function LeaderCard({
  leaders,
  username,
  assignmentName,
  assignmentLabel = 'Casa de Paz',
  assignmentIcon = House,
  phone,
  email,
  status,
  onClick,
  actions,
  ...props
}: LeaderCardProps) {
  return (
    <DomainCard onClick={onClick} {...props}>
      <div className="flex items-start gap-3">
        {leaders.length > 0 ? (
          <LeadersRow leaders={leaders} className="flex-1" />
        ) : (
          <p className="min-w-0 flex-1 truncate text-body font-semibold text-foreground">
            {username}
          </p>
        )}

        {status ? <EntityStatusBadge status={status} /> : null}
      </div>

      <DomainCardMeta icon={User} label="Usuario">
        {username}
      </DomainCardMeta>

      <DomainCardMeta icon={assignmentIcon} label={assignmentLabel}>
        {assignmentName ?? 'Sin asignar'}
      </DomainCardMeta>

      {phone ? (
        <DomainCardMeta icon={Phone} label="Teléfono">
          {phone}
        </DomainCardMeta>
      ) : null}

      {email ? (
        <DomainCardMeta icon={Mail} label="Correo">
          {email}
        </DomainCardMeta>
      ) : null}

      {actions ? (
        <div className="flex justify-end gap-1 border-t border-border pt-3">{actions}</div>
      ) : null}
    </DomainCard>
  );
}
