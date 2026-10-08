'use client';

import { Download, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';
import { Button } from '../button/button';
import { Input } from '../input/input';
import { DataTableColumnsMenu, type DataTableColumnOption } from './data-table-columns-menu';

export interface DataTableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Slot for the screen's own filter controls (doc18 §30 "Filtros"). */
  filters?: ReactNode;
  onExport?: () => void;
  columnOptions: DataTableColumnOption[];
  hiddenColumnIds: string[];
  onToggleColumn: (columnId: string) => void;
  /** Hides the whole "Columnas" control when no column is hideable. */
  showColumnsMenu: boolean;
}

/**
 * Toolbar of the Tabla Enterprise (doc18 §15): "Buscador. Filtros.
 * Paginación. Columnas configurables. Exportar." Pagination is rendered
 * below the table by `<DataTable>`; the other three live here.
 *
 * Every control is optional at the call site but the *layout* is fixed, so
 * two different listings can never end up with the search box on opposite
 * sides of the screen.
 */
export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar…',
  filters,
  onExport,
  columnOptions,
  hiddenColumnIds,
  onToggleColumn,
  showColumnsMenu,
}: DataTableToolbarProps) {
  const hasSearch = onSearchChange !== undefined;
  const hasTrailingControls = filters !== undefined || showColumnsMenu || onExport !== undefined;

  if (!hasSearch && !hasTrailingControls) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
      {hasSearch ? (
        <div className="relative w-full tablet:max-w-sm">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground-muted">
            <Icon icon={Search} size="xs" />
          </span>
          <Input
            type="search"
            value={searchValue ?? ''}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            // No visible label here: the placeholder is the affordance and
            // `aria-label` carries the accessible name (doc18 §27).
            aria-label="Buscar en la tabla"
            className="pl-9"
          />
        </div>
      ) : (
        <div />
      )}

      {hasTrailingControls ? (
        <div className={cn('flex flex-wrap items-center gap-2')}>
          {filters}

          {showColumnsMenu ? (
            <DataTableColumnsMenu
              columns={columnOptions}
              hiddenColumnIds={hiddenColumnIds}
              onToggle={onToggleColumn}
            />
          ) : null}

          {onExport ? (
            <Button type="button" variant="secondary" onClick={onExport}>
              <Icon icon={Download} size="xs" />
              Exportar
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
