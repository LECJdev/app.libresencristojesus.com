'use client';

import { Camera, HandCoins, Users } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { DomainCard, DomainCardMeta } from './domain-card';
import { MeetingStatusBadge, type MeetingStatus } from './status-badge';

export interface MeetingCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> {
  /** Meeting date. A `string` is rendered verbatim; a `Date` is formatted. */
  date: string | Date;
  /** Topic or title of the session. */
  topic?: string;
  status?: MeetingStatus;
  attendanceCount?: number;
  /** Offering in COP. Integers only, per doc19. */
  offeringAmount?: number;
  photoCount?: number;
  onClick?: () => void;
}

/**
 * Dates are formatted against a fixed Colombian time zone rather than the
 * runtime's. Server rendering happens in UTC and the browser in
 * America/Bogota (UTC-5), so an unpinned formatter can render a different
 * day on each side and trigger a hydration mismatch.
 */
const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeZone: 'America/Bogota',
});

/**
 * doc19 states offerings are stored as integers with no decimals, so the
 * formatter drops the fraction entirely: "$ 250.000", never "$ 250.000,00".
 */
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat('es-CO');

/**
 * MeetingCard — presentational tile for a Reunión (doc07/doc10). It shows
 * the numbers it is given and never derives, validates or aggregates them.
 */
export function MeetingCard({
  date,
  topic,
  status,
  attendanceCount,
  offeringAmount,
  photoCount,
  onClick,
  ...props
}: MeetingCardProps) {
  const formattedDate = typeof date === 'string' ? date : dateFormatter.format(date);

  return (
    <DomainCard onClick={onClick} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* The date is the heading: a meeting is identified by when it
              happened, and the topic is optional. */}
          <h3 className="truncate text-body font-semibold text-foreground first-letter:uppercase">
            {formattedDate}
          </h3>
          {topic ? <p className="truncate text-small text-foreground-muted">{topic}</p> : null}
        </div>

        {status ? <MeetingStatusBadge status={status} /> : null}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {attendanceCount !== undefined ? (
          <DomainCardMeta icon={Users} label="Asistentes">
            <span className="font-bold text-foreground">
              {countFormatter.format(attendanceCount)}
            </span>{' '}
            asistentes
          </DomainCardMeta>
        ) : null}

        {offeringAmount !== undefined ? (
          <DomainCardMeta icon={HandCoins} label="Ofrenda">
            <span className="font-bold text-foreground">
              {currencyFormatter.format(offeringAmount)}
            </span>
          </DomainCardMeta>
        ) : null}

        {photoCount !== undefined ? (
          <DomainCardMeta icon={Camera} label="Fotografías">
            {countFormatter.format(photoCount)} {photoCount === 1 ? 'foto' : 'fotos'}
          </DomainCardMeta>
        ) : null}
      </div>
    </DomainCard>
  );
}
