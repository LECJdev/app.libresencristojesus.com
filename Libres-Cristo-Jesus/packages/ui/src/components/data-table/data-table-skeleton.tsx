'use client';

import { Skeleton } from '../skeleton/skeleton';

export interface DataTableSkeletonProps {
  /** Number of visible columns, so the placeholder matches the real grid. */
  columnCount: number;
  rowCount?: number;
}

/**
 * Loading placeholder for the table (doc18 §20: "Nunca spinner infinito.
 * Siempre Skeleton." and §23, which lists "Tabla" among the screens that
 * must have one).
 *
 * Rendered inside the real `<tbody>` so column widths do not jump when the
 * data arrives.
 */
export function DataTableSkeleton({ columnCount, rowCount = 5 }: DataTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`} className="border-b border-border">
          {Array.from({ length: columnCount }, (_, columnIndex) => (
            <td key={`skeleton-cell-${rowIndex}-${columnIndex}`} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
