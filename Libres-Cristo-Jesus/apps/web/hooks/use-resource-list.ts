'use client';

import { useCallback, useMemo, useState } from 'react';
import type { DataTableSort } from '@lcj/ui';

/**
 * The listing state every table screen needs: page, page size, search,
 * sort and arbitrary filters.
 *
 * WHY THIS EXISTS
 * Distritos and Casas de Paz had grown byte-identical copies of this
 * block, and three more modules were about to inherit it. The bug it
 * prevents is specific and easy to reintroduce by hand: forgetting to
 * reset to page 1 when a filter changes leaves the user on page 4 of a
 * result set that now has one page, staring at an empty table that looks
 * like "no records".
 *
 * It holds UI state only — no fetching. The screen still owns its query
 * hook, so this never becomes a second, competing data layer.
 */

export interface UseResourceListOptions {
  /** Column the table sorts by until the user says otherwise. */
  defaultSort: DataTableSort;
  defaultPageSize?: number;
}

export interface UseResourceList<TFilters extends Record<string, string>> {
  page: number;
  pageSize: number;
  search: string;
  sort: DataTableSort;
  filters: TFilters;
  setPage: (page: number) => void;
  /** Also returns to page 1 — a different page size means different pages. */
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSort: (sort: DataTableSort) => void;
  /** Sets one filter and returns to page 1. */
  setFilter: (key: keyof TFilters, value: string) => void;
}

export function useResourceList<TFilters extends Record<string, string>>(
  initialFilters: TFilters,
  { defaultSort, defaultPageSize = 20 }: UseResourceListOptions,
): UseResourceList<TFilters> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [search, setSearchState] = useState('');
  const [sort, setSortState] = useState<DataTableSort>(defaultSort);
  const [filters, setFilters] = useState<TFilters>(initialFilters);

  // Every narrowing action resets the page. Centralising it here is the
  // whole point: it is one line per setter, and one line each screen used
  // to be free to forget.
  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setPage(1);
  }, []);

  const setSort = useCallback((next: DataTableSort) => {
    setSortState(next);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: keyof TFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  }, []);

  return useMemo(
    () => ({
      page,
      pageSize,
      search,
      sort,
      filters,
      setPage,
      setPageSize,
      setSearch,
      setSort,
      setFilter,
    }),
    [page, pageSize, search, sort, filters, setPageSize, setSearch, setSort, setFilter],
  );
}
