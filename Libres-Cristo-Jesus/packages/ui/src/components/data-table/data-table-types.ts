import type { ReactNode } from 'react';

/**
 * Shared contracts for the Tabla Enterprise (doc18 §15). Extracted into
 * their own module so the table, its toolbar and its column menu can all
 * depend on the same shapes without importing each other.
 */

/**
 * A column definition. `accessor` returns a `ReactNode` rather than a raw
 * value on purpose: cells frequently render a `<Badge>` or an `<Avatar>`,
 * and forcing a value-only contract would push that formatting back into
 * the screens the Design System is meant to keep consistent.
 */
export interface DataTableColumn<TRow> {
  /** Stable id — used as the React key, the sort key and the toggle key. */
  id: string;
  /** Visible column heading. Spanish, supplied by the caller. */
  header: ReactNode;
  accessor: (row: TRow) => ReactNode;
  /** Enables the sort control on the header (doc19 §7 `?sort=&order=`). */
  sortable?: boolean;
  /** Allows the user to hide it from the "Columnas" menu (doc18 §15). */
  hideable?: boolean;
  /**
   * Label used inside the "Columnas" menu. Only needed when `header` is
   * not a plain string (an icon, a tooltip wrapper, …).
   */
  menuLabel?: string;
  /** Extra classes for the body cells, e.g. `text-right` on amounts. */
  className?: string;
  /** Extra classes for the header cell. */
  headerClassName?: string;
}

/** Matches doc19 §7: `?order=asc` / `?order=desc`. */
export type SortDirection = 'asc' | 'desc';

export interface DataTableSort {
  columnId: string;
  direction: SortDirection;
}
