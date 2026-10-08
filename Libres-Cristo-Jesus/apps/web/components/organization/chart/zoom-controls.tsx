'use client';

import { Minus, Plus } from 'lucide-react';
import { IconButton } from '@lcj/ui';

/** The fixed steps `ZoomControls` moves through — doc: 0.75 / 0.9 / 1 / 1.1 / 1.25. */
export const ZOOM_LEVELS = [0.75, 0.9, 1, 1.1, 1.25] as const;
export type ZoomLevel = (typeof ZOOM_LEVELS)[number];
export const DEFAULT_ZOOM: ZoomLevel = 1;

export interface ZoomControlsProps {
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
}

/**
 * Since the diagram is plain Flexbox/CSS (no canvas, no pan/zoom library),
 * "zoom" is a `transform: scale()` on the whole tree container — these
 * buttons just move `zoom` through the fixed step list. Clicking the
 * percentage label resets to 100 %.
 */
export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const index = ZOOM_LEVELS.indexOf(zoom);

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface px-1 py-0.5">
      <IconButton
        icon={Minus}
        aria-label="Alejar"
        variant="ghost"
        size="sm"
        disabled={index <= 0}
        onClick={() => {
          const next = ZOOM_LEVELS[index - 1];
          if (next !== undefined) {
            onZoomChange(next);
          }
        }}
      />
      <button
        type="button"
        onClick={() => {
          onZoomChange(DEFAULT_ZOOM);
        }}
        className="min-w-12 px-1 text-center text-small font-medium text-foreground-muted transition-colors duration-fast hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton
        icon={Plus}
        aria-label="Acercar"
        variant="ghost"
        size="sm"
        disabled={index === -1 || index >= ZOOM_LEVELS.length - 1}
        onClick={() => {
          const next = ZOOM_LEVELS[index + 1];
          if (next !== undefined) {
            onZoomChange(next);
          }
        }}
      />
    </div>
  );
}
