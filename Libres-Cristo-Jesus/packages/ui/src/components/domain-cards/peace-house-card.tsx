'use client';

import { Building2, CalendarDays, MapPin } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Icon } from '../../lib/icon';
import { DomainCard, DomainCardMeta, DomainCardMetrics } from './domain-card';
import { LeadersRow, type CardLeader } from './leaders';
import { EntityStatusBadge, type EntityStatus } from './status-badge';

export interface PeaceHouseCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> {
  name: string;
  /** Parent district name, already resolved by the caller. */
  district?: string;
  /** Up to two, because leadership is modelled as a couple. */
  leaders?: CardLeader[];
  /** Overrides the leaders row's avatar size for this one caller — every other caller keeps the default. */
  leadersAvatarClassName?: string;
  address?: string;
  municipality?: string;
  /** Pre-translated weekday, e.g. "Miércoles". */
  meetingDay?: string;
  /** Pre-formatted time, e.g. "7:00 p. m.". */
  meetingTime?: string;
  status?: EntityStatus;
  /** Average attendance; rendered as a bold metric (doc18 §4). */
  attendanceAverage?: number;
  onClick?: () => void;
  /**
   * Row of per-card controls (ver/editar/eliminar…), rendered as a footer
   * strip — mirrors `PersonCard`'s `actions` slot so a table→card
   * conversion never drops the row actions it used to offer.
   */
  actions?: ReactNode;
}

/**
 * PeaceHouseCard — presentational tile for a Casa de Paz (doc07).
 *
 * Day and time arrive pre-formatted as strings: weekday names and the
 * 12-hour Colombian time format are a locale concern the app already
 * solves, and duplicating it here would risk two different renderings of
 * the same schedule.
 */
export function PeaceHouseCard({
  name,
  district,
  leaders,
  leadersAvatarClassName,
  address,
  municipality,
  meetingDay,
  meetingTime,
  status,
  attendanceAverage,
  onClick,
  actions,
  ...props
}: PeaceHouseCardProps) {
  const schedule = [meetingDay, meetingTime].filter(Boolean).join(' · ');

  return (
    <DomainCard onClick={onClick} {...props}>
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="truncate text-h4 font-semibold text-foreground">{name}</h3>
          {district ? (
            <p className="flex min-w-0 items-center gap-1 text-caption text-foreground-muted">
              <Icon icon={Building2} size="xs" />
              <span className="truncate">{district}</span>
            </p>
          ) : null}
        </div>

        {status ? <EntityStatusBadge status={status} /> : null}
      </div>

      {address || municipality ? (
        <DomainCardMeta icon={MapPin} label="Dirección">
          {[address, municipality].filter(Boolean).join(', ')}
        </DomainCardMeta>
      ) : null}

      {schedule ? (
        <DomainCardMeta icon={CalendarDays} label="Reunión">
          {schedule}
        </DomainCardMeta>
      ) : null}

      {leaders && leaders.length > 0 ? (
        <LeadersRow leaders={leaders} avatarClassName={leadersAvatarClassName} />
      ) : null}

      {attendanceAverage !== undefined ? (
        <DomainCardMetrics metrics={[{ label: 'Asistencia promedio', value: attendanceAverage }]} />
      ) : null}

      {actions ? (
        <div className="flex justify-end gap-1 border-t border-border pt-3">{actions}</div>
      ) : null}
    </DomainCard>
  );
}
