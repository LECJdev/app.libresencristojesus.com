'use client';

import { cn } from '../../lib/cn';
import { Avatar } from '../avatar/avatar';

/**
 * A person shown as a leader on a card. Only what the card renders — no
 * ids, no roles, no permissions: those belong to the domain layer (doc05).
 */
export interface CardLeader {
  name: string;
  photo?: string;
}

export interface LeadersRowProps {
  leaders: CardLeader[];
  /**
   * Leadership is modelled as a couple across the product, so the default
   * cap is two. Extra entries are summarised as "+N".
   */
  max?: number;
  className?: string;
  /** Overrides the avatar circle's size (e.g. `size-[30px]`) for this one caller. */
  avatarClassName?: string;
}

/**
 * Overlapping avatars plus the joined names, used by every card that shows
 * who leads a unit. Extracted so the "couple" presentation stays identical
 * on a Distrito, a Casa de Paz and anything added later.
 */
export function LeadersRow({ leaders, max = 2, className, avatarClassName }: LeadersRowProps) {
  if (leaders.length === 0) {
    return null;
  }

  const shown = leaders.slice(0, max);
  const overflow = leaders.length - shown.length;
  // Spanish list conjunction: "Ana y Carlos", not "Ana, Carlos".
  const names = shown.map((leader) => leader.name).join(' y ');

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <div className="flex shrink-0 -space-x-2">
        {shown.map((leader, index) => (
          <Avatar
            key={`${leader.name}-${index}`}
            src={leader.photo}
            name={leader.name}
            size="xs"
            className={cn('ring-2 ring-surface', avatarClassName)}
          />
        ))}
      </div>
      <p className="min-w-0 truncate text-small text-foreground-muted">
        {names}
        {overflow > 0 ? ` +${overflow}` : ''}
      </p>
    </div>
  );
}
