'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { DataTableSkeleton } from './data-table-skeleton';
import { DataTableToolbar } from './data-table-toolbar';
import type { DataTableColumn, DataTableSort } from './data-table-types';

/**
 * DataTable — the "Tabla Enterprise" of doc18 §15.
 *
 * The doc is categorical: every table in the product shares "Buscador,
 * Filtros, Paginación, Columnas configurables, Exportar" and "Nunca tablas
 * simples". That is why those five affordances are built in here rather
 * than being re-assembled per screen.
 *
 * It holds no server state: search text, filters, sorting and pagination
 * are all controlled from outside, matching the request contract of
 * doc19 §6/§7 (`page`, `pageSize`, `sort`, `order`, `search`). The only
 * internal state is column visibility, which is pure UI preference.
 */
export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  /** Stable row key. Falls back to the array index when omitted. */
  getRowId?: (row: TRow, index: number) => string;

  /* Toolbar — doc18 §15 */
  searchValue?: string;
  /** Omit to hide the search box entirely. */
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  onExport?: () => void;

  /* Sorting — doc19 §7 */
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;

  /* Column visibility — controlled when both props are supplied */
  hiddenColumnIds?: string[];
  onHiddenColumnIdsChange?: (hiddenColumnIds: string[]) => void;

  /* States */
  loading?: boolean;
  emptyState?: ReactNode;

  /** Slot for `<Pagination>` (doc18 §30, last row of the page pattern). */
  pagination?: ReactNode;
  /** Screen-reader description of the table's purpose. */
  caption?: string;
  className?: string;
}

export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  onExport,
  sort,
  onSortChange,
  hiddenColumnIds,
  onHiddenColumnIdsChange,
  loading = false,
  emptyState,
  pagination,
  caption,
  className,
}: DataTableProps<TRow>) {
  const [internalHiddenIds, setInternalHiddenIds] = useState<string[]>([]);
  const isControlled = hiddenColumnIds !== undefined;
  const effectiveHiddenIds = isControlled ? hiddenColumnIds : internalHiddenIds;

  const toggleColumn = (columnId: string) => {
    const next = effectiveHiddenIds.includes(columnId)
      ? effectiveHiddenIds.filter((id) => id !== columnId)
      : [...effectiveHiddenIds, columnId];

    if (isControlled) {
      onHiddenColumnIdsChange?.(next);
    } else {
      setInternalHiddenIds(next);
    }
  };

  const visibleColumns = useMemo(
    () => columns.filter((column) => !effectiveHiddenIds.includes(column.id)),
    [columns, effectiveHiddenIds],
  );

  const hideableColumns = useMemo(
    () =>
      columns
        .filter((column) => column.hideable === true)
        .map((column) => ({
          id: column.id,
          // `header` is a ReactNode, so a plain string is used when the
          // caller provided one and the id is the readable fallback.
          label:
            column.menuLabel ?? (typeof column.header === 'string' ? column.header : column.id),
        })),
    [columns],
  );

  const handleSort = (column: DataTableColumn<TRow>) => {
    if (column.sortable !== true || onSortChange === undefined) {
      return;
    }

    const isCurrent = sort?.columnId === column.id;
    onSortChange({
      columnId: column.id,
      direction: isCurrent && sort?.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const showEmptyState = !loading && rows.length === 0;

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-4', className)}>
      <DataTableToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        onExport={onExport}
        columnOptions={hideableColumns}
        hiddenColumnIds={effectiveHiddenIds}
        onToggleColumn={toggleColumn}
        showColumnsMenu={hideableColumns.length > 0}
      />

      {/*
        `min-w-0` on the wrapper is what keeps a wide table from stretching
        the page: the overflow is contained here instead of pushing the
        surrounding grid sideways on mobile.

        `tabIndex={0}` + a role and a label because a scrollable region that
        nothing inside can receive focus is UNREACHABLE BY KEYBOARD — a mouse
        user drags it, a keyboard user simply never sees the columns past the
        edge. Reported by axe as `scrollable-region-focusable`. The focus ring
        is the standard one, so the region announces itself when tabbed to
        instead of scrolling silently.
      */}
      <div
        tabIndex={0}
        role="region"
        aria-label={caption ?? 'Tabla de datos'}
        className={cn(
          'w-full min-w-0 overflow-x-auto rounded-lg border border-border bg-surface',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <table className="w-full min-w-max border-collapse text-left text-small">
          {caption ? <caption className="sr-only">{caption}</caption> : null}

          <thead className="border-b border-border bg-surface-muted">
            <tr>
              {visibleColumns.map((column) => {
                const isSorted = sort?.columnId === column.id;
                const isSortable = column.sortable === true && onSortChange !== undefined;

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      isSortable
                        ? isSorted
                          ? sort?.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={cn(
                      'whitespace-nowrap px-4 py-3 font-semibold text-foreground',
                      column.headerClassName,
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        aria-label={`Ordenar por ${
                          typeof column.header === 'string' ? column.header : column.id
                        }`}
                        className={cn(
                          'flex items-center gap-1 rounded-xs transition-colors duration-fast',
                          'hover:text-primary-700',
                        )}
                      >
                        {column.header}
                        <Icon
                          icon={
                            isSorted
                              ? sort?.direction === 'asc'
                                ? ArrowUp
                                : ArrowDown
                              : ArrowUpDown
                          }
                          size="xs"
                          className={isSorted ? 'text-primary-600' : 'text-foreground-muted'}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? <DataTableSkeleton columnCount={visibleColumns.length} /> : null}

            {showEmptyState ? (
              <tr>
                <td colSpan={Math.max(visibleColumns.length, 1)} className="px-4 py-10">
                  {/* doc18 §21 wants a proper illustrated EmptyState; the
                      caller passes it in, and this plain line is only the
                      last-resort fallback. */}
                  {emptyState ?? (
                    <p className="text-center text-small text-foreground-muted">
                      No hay información para mostrar.
                    </p>
                  )}
                </td>
              </tr>
            ) : null}

            {!loading &&
              rows.map((row, rowIndex) => (
                <tr
                  key={getRowId?.(row, rowIndex) ?? `row-${rowIndex}`}
                  className="border-b border-border last:border-b-0 transition-colors duration-fast hover:bg-surface-muted"
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className={cn('px-4 py-3 align-middle text-foreground', column.className)}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pagination}
    </div>
  );
}
