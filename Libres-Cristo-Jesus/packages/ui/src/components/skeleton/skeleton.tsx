import * as React from 'react';

import { cn } from '../../lib/cn';

/**
 * Skeleton — doc18 §20/§23: "Nunca spinner infinito. Siempre Skeleton", on
 * "todas las pantallas" (Dashboard, Tabla, Formulario, Cards).
 *
 * A skeleton beats a spinner because it reserves the real layout: content
 * arrives without the page jumping, and the shape itself tells the user what
 * is coming. The convenience variants below exist so screens compose the
 * documented four shapes instead of hand-rolling grey rectangles.
 *
 * Every skeleton is `aria-hidden`: placeholder boxes are pure noise to a
 * screen reader. The surrounding `Loading` region announces the wait once.
 */
export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-neutral-200', className)}
      {...props}
    />
  );
});

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of placeholder lines. */
  lines?: number;
}

export const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  function SkeletonText({ className, lines = 3, ...props }, ref) {
    const safeLines = Math.max(1, lines);

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {Array.from({ length: safeLines }, (_, index) => (
          <Skeleton
            key={index}
            // The last line is short, the way a real paragraph ends — a block
            // of equal-width bars reads as a table, not as prose.
            className={cn('h-4', index === safeLines - 1 ? 'w-3/5' : 'w-full')}
          />
        ))}
      </div>
    );
  },
);

export type SkeletonCardProps = React.HTMLAttributes<HTMLDivElement>;

/** Mirrors the `Card` shell (radius, border, padding) so nothing shifts. */
export const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  function SkeletonCard({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('rounded-lg border border-border bg-surface p-6 shadow-sm', className)}
        {...props}
      >
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-2/5" />
          <SkeletonText lines={2} />
        </div>
      </div>
    );
  },
);

export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
}

export const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  function SkeletonTable({ className, rows = 5, columns = 4, ...props }, ref) {
    const safeRows = Math.max(1, rows);
    const safeColumns = Math.max(1, columns);
    // An inline grid template is the one place a computed value is
    // unavoidable: the column count is runtime data, so no static utility
    // can express it. Every other dimension still comes from tokens.
    const gridStyle: React.CSSProperties = {
      gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))`,
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3 rounded-lg border border-border bg-surface p-4',
          className,
        )}
        {...props}
      >
        <div className="grid gap-4" style={gridStyle}>
          {Array.from({ length: safeColumns }, (_, column) => (
            <Skeleton key={`header-${column}`} className="h-4 w-3/4" />
          ))}
        </div>
        {Array.from({ length: safeRows }, (_, row) => (
          <div key={`row-${row}`} className="grid gap-4" style={gridStyle}>
            {Array.from({ length: safeColumns }, (_, column) => (
              <Skeleton key={`cell-${row}-${column}`} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  },
);
