'use client';

import { Badge } from '../badge/badge';

/**
 * Status vocabulary shared by the presentational domain cards.
 *
 * These are UI-level defaults, not business rules: the card only maps a
 * status key to a label and a Badge colour. Which statuses a Distrito or a
 * Casa de Paz may actually reach, and what transitions are legal, lives in
 * the domain layer (doc02), never here. A screen that needs a different
 * wording passes its own `<Badge>` instead.
 *
 * Centralising the mapping in one module means the whole card family shares
 * a single source of truth for status colour, so "Activo" is never green on
 * one card and blue on another.
 */
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'closed';

const ENTITY_STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  closed: 'Cerrado',
};

const ENTITY_STATUS_VARIANTS: Record<EntityStatus, 'success' | 'neutral' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
  closed: 'error',
};

export interface EntityStatusBadgeProps {
  status: EntityStatus;
}

export function EntityStatusBadge({ status }: EntityStatusBadgeProps) {
  return <Badge variant={ENTITY_STATUS_VARIANTS[status]}>{ENTITY_STATUS_LABELS[status]}</Badge>;
}

/**
 * Meeting lifecycle as surfaced in the UI. Ordered from planning to
 * closure so the labels read as a progression to the user.
 */
export type MeetingStatus =
  'scheduled' | 'inProgress' | 'pending' | 'reported' | 'validated' | 'closed';

const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: 'Programada',
  inProgress: 'En curso',
  pending: 'Pendiente',
  reported: 'Reportada',
  validated: 'Validada',
  closed: 'Cerrada',
};

const MEETING_STATUS_VARIANTS: Record<
  MeetingStatus,
  'success' | 'neutral' | 'warning' | 'error' | 'info'
> = {
  scheduled: 'neutral',
  inProgress: 'info',
  // "Pendiente" is the only state that asks the user for an action, so it
  // is the only one rendered in the attention colour.
  pending: 'warning',
  reported: 'info',
  validated: 'success',
  closed: 'neutral',
};

export interface MeetingStatusBadgeProps {
  status: MeetingStatus;
}

export function MeetingStatusBadge({ status }: MeetingStatusBadgeProps) {
  return <Badge variant={MEETING_STATUS_VARIANTS[status]}>{MEETING_STATUS_LABELS[status]}</Badge>;
}
