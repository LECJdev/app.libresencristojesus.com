'use client';

import { MapPin } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { DomainCard, DomainCardMeta, DomainCardMetrics } from './domain-card';
import { LeadersRow, type CardLeader } from './leaders';
import { EntityStatusBadge, type EntityStatus } from './status-badge';

export interface OrganizationCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> {
  name: string;
  /**
   * Free-form label for the kind of unit ("Distrito", "Zona", "Sector").
   * A plain string on purpose: the organisational hierarchy is configurable
   * in the domain (doc06), so the Design System must not freeze a union of
   * levels that the business can change.
   */
  type?: string;
  /** Up to two, because leadership is modelled as a couple. */
  leaders?: CardLeader[];
  /** Overrides the leaders row's avatar size for this one caller — every other caller keeps the default. */
  leadersAvatarClassName?: string;
  location?: string;
  status?: EntityStatus;
  /** Pre-formatted figures, e.g. `{ label: 'Casas de Paz', value: 12 }`. */
  metrics?: { label: string; value: string | number }[];
  onClick?: () => void;
  /**
   * Row of per-card controls (ver/editar/eliminar…), rendered as a footer
   * strip — mirrors `PersonCard`'s `actions` slot so every listing that
   * moves from a table to a card grid keeps its row actions instead of
   * losing them to the conversion.
   */
  actions?: ReactNode;
}

/**
 * OrganizationCard — presentational tile for an organisational unit
 * (doc06). It renders exactly what it is handed: no fetching, no
 * permission checks, no hierarchy traversal.
 */
export function OrganizationCard({
  name,
  type,
  leaders,
  leadersAvatarClassName,
  location,
  status,
  metrics,
  onClick,
  actions,
  ...props
}: OrganizationCardProps) {
  return (
    <DomainCard onClick={onClick} {...props}>
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {type ? <p className="text-caption text-foreground-muted">{type}</p> : null}
          <h3 className="truncate text-h4 font-semibold text-foreground">{name}</h3>
        </div>

        {status ? <EntityStatusBadge status={status} /> : null}
      </div>

      {location ? (
        <DomainCardMeta icon={MapPin} label="Ubicación">
          {location}
        </DomainCardMeta>
      ) : null}

      {leaders && leaders.length > 0 ? (
        <LeadersRow leaders={leaders} avatarClassName={leadersAvatarClassName} />
      ) : null}

      {metrics ? <DomainCardMetrics metrics={metrics} /> : null}

      {actions ? (
        <div className="flex justify-end gap-1 border-t border-border pt-3">{actions}</div>
      ) : null}
    </DomainCard>
  );
}
