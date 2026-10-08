'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * Grid — the responsive grid of doc18 §6: 4 columns on mobile, 8 on
 * tablet, 12 on desktop. Screens compose their layout by dropping
 * `<GridItem>`s into it instead of inventing per-page flex arrangements.
 */
export type GridProps = ComponentPropsWithoutRef<'div'>;

export function Grid({ className, ...props }: GridProps) {
  return (
    <div
      className={cn(
        'grid w-full min-w-0 grid-cols-4 gap-4 tablet:grid-cols-8 desktop:grid-cols-12',
        className,
      )}
      {...props}
    />
  );
}

export type MobileSpan = 1 | 2 | 3 | 4;
export type TabletSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type DesktopSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Spans are looked up in static maps instead of being interpolated into a
 * template string. Tailwind extracts class names by scanning source text,
 * so a computed `col-span-${n}` would simply never be generated.
 */
const MOBILE_SPANS: Record<MobileSpan, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
};

const TABLET_SPANS: Record<TabletSpan, string> = {
  1: 'tablet:col-span-1',
  2: 'tablet:col-span-2',
  3: 'tablet:col-span-3',
  4: 'tablet:col-span-4',
  5: 'tablet:col-span-5',
  6: 'tablet:col-span-6',
  7: 'tablet:col-span-7',
  8: 'tablet:col-span-8',
};

const DESKTOP_SPANS: Record<DesktopSpan, string> = {
  1: 'desktop:col-span-1',
  2: 'desktop:col-span-2',
  3: 'desktop:col-span-3',
  4: 'desktop:col-span-4',
  5: 'desktop:col-span-5',
  6: 'desktop:col-span-6',
  7: 'desktop:col-span-7',
  8: 'desktop:col-span-8',
  9: 'desktop:col-span-9',
  10: 'desktop:col-span-10',
  11: 'desktop:col-span-11',
  12: 'desktop:col-span-12',
};

export interface GridItemProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Columns to span at each breakpoint. Defaults to the full width of the
   * grid at every size, which is the mobile-first behaviour: a block takes
   * the whole row unless a wider viewport is told otherwise.
   */
  cols?: {
    mobile?: MobileSpan;
    tablet?: TabletSpan;
    desktop?: DesktopSpan;
  };
}

export function GridItem({ cols, className, ...props }: GridItemProps) {
  return (
    <div
      className={cn(
        'min-w-0',
        MOBILE_SPANS[cols?.mobile ?? 4],
        cols?.tablet !== undefined ? TABLET_SPANS[cols.tablet] : 'tablet:col-span-8',
        cols?.desktop !== undefined ? DESKTOP_SPANS[cols.desktop] : 'desktop:col-span-12',
        className,
      )}
      {...props}
    />
  );
}
