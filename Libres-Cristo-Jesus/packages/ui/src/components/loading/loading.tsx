import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { SkeletonText } from '../skeleton/skeleton';

/**
 * Loading — the generic "content is on its way" region.
 *
 * WHY THE DEFAULT IS A SKELETON, NOT A SPINNER
 * doc18 §20 is blunt: "Nunca spinner infinito. Siempre Skeleton." A spinner
 * conveys nothing except that something is happening — it reserves no layout,
 * so the page jumps when data lands, and an indefinite one is indistinguishable
 * from a hung request. The skeleton default makes the documented behaviour the
 * path of least resistance.
 *
 * `variant="spinner"` is therefore a narrow escape hatch, NOT an alternative
 * page state: use it only inline, for a short, bounded action whose outcome
 * replaces it within a second or two (a row-level action, a button's own
 * pending state). Never as the loading state of a screen, a card or a table —
 * those take `SkeletonCard` / `SkeletonTable`.
 */
export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'skeleton' | 'spinner';
  /** Announced to assistive tech; also the visible text next to the spinner. */
  label?: string;
  /** Skeleton lines to reserve. Ignored by the spinner variant. */
  lines?: number;
  /** Hides the visible label, keeping it for screen readers only. */
  hideLabel?: boolean;
}

export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(function Loading(
  { className, variant = 'skeleton', label = 'Cargando…', lines = 3, hideLabel = false, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      // One polite live region for the whole wait: the placeholder boxes
      // themselves are `aria-hidden`, so this is the only announcement.
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(variant === 'spinner' ? 'inline-flex items-center gap-2' : 'w-full', className)}
      {...props}
    >
      {variant === 'spinner' ? (
        <>
          <Icon icon={Loader2} size="sm" className="animate-spin text-primary-600" />
          <span className={cn(hideLabel ? 'sr-only' : 'text-small text-foreground-muted')}>
            {label}
          </span>
        </>
      ) : (
        <>
          <span className="sr-only">{label}</span>
          <SkeletonText lines={lines} />
        </>
      )}
    </div>
  );
});
