'use client';

import { House, IdCard, Mail, Phone } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';
import { DomainCard, DomainCardMeta } from './domain-card';
import { EntityStatusBadge, type EntityStatus } from './status-badge';

export interface PersonCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> {
  firstName: string;
  lastName: string;
  photo?: string;
  /** Identity document, e.g. cédula. Pre-formatted by the caller. */
  document?: string;
  phone?: string;
  email?: string;
  /**
   * Stage of the pastoral process ("Asistente", "Nuevo", "Consolidación",
   * "Discípulo", …). A free label because the stages are configurable in
   * the domain (doc09) — the Design System must not freeze them.
   */
  stage?: string;
  /** Casa de Paz the person belongs to, already resolved by the caller. */
  peaceHouse?: string;
  status?: EntityStatus;
  /** % de reuniones a las que asistió. `null`/`undefined` omite el dato — nunca se muestra un 0% inventado. */
  attendanceRate?: number | null;
  onClick?: () => void;
  /**
   * Row of per-card controls (view/edit/delete…), rendered as a footer
   * strip. Kept as a free slot — icons and permissions are the caller's
   * concern — rather than fixed `onView`/`onEdit`/`onDelete` callbacks,
   * mirroring how `DataTable`'s own action column is caller-composed.
   *
   * Deliberately not paired with `onClick` on the same card: doc18 §27
   * forbids nesting interactive elements inside a clickable container, so a
   * card with footer actions stays non-interactive at the root.
   */
  actions?: ReactNode;
}

/**
 * PersonCard — presentational tile for a Persona (doc09). Contact details
 * are rendered as plain text, not `tel:`/`mailto:` links, so a card that is
 * itself clickable never nests an interactive element inside a button.
 */
export function PersonCard({
  firstName,
  lastName,
  photo,
  document,
  phone,
  email,
  stage,
  peaceHouse,
  status,
  attendanceRate,
  onClick,
  actions,
  ...props
}: PersonCardProps) {
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <DomainCard onClick={onClick} {...props}>
      <div className="flex items-start gap-3">
        <Avatar src={photo} name={fullName} size="md" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-body font-semibold text-foreground">{fullName}</h3>
          {stage ? (
            <div className="flex">
              <Badge variant="info">{stage}</Badge>
            </div>
          ) : null}
        </div>

        {status || (attendanceRate !== null && attendanceRate !== undefined) ? (
          <div className="flex flex-col items-end gap-1">
            {status ? <EntityStatusBadge status={status} /> : null}
            {attendanceRate !== null && attendanceRate !== undefined ? (
              <span className="text-caption font-medium text-foreground-muted">
                {attendanceRate}% asistencia
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {document ? (
        <DomainCardMeta icon={IdCard} label="Documento">
          {document}
        </DomainCardMeta>
      ) : null}

      {peaceHouse ? (
        <DomainCardMeta icon={House} label="Casa de Paz">
          {peaceHouse}
        </DomainCardMeta>
      ) : null}

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
