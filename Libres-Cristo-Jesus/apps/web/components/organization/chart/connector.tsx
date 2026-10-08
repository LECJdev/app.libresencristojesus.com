import type { ReactNode } from 'react';
import { cn } from '@lcj/ui';

/**
 * Decorative connector pieces — CSS `border`/`div`s only (no SVG, no graph
 * library), exactly as instructed. They only need to READ as connected, not
 * be pixel-perfect: a short vertical stub feeds into a horizontal bar that
 * spans the row of cards hanging from it.
 */

const STUB_HEIGHT: Record<'sm' | 'lg', string> = {
  // The stub under the main card, before the district row.
  lg: 'h-6',
  // The smaller stub above each district's Casas de Paz / each Casa de
  // Paz's leader row.
  sm: 'h-4',
};

export function ConnectorStub({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <div aria-hidden="true" className={cn('mx-auto w-px bg-primary-300', STUB_HEIGHT[size])} />
  );
}

/**
 * Wraps a row of cards with a top border that simulates the horizontal bar
 * every card in the row "hangs from". `px-6` keeps the line from touching
 * the row's outer edges.
 */
export function ConnectorBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border-t border-primary-300 px-6 pt-4', className)} aria-hidden={false}>
      {children}
    </div>
  );
}
