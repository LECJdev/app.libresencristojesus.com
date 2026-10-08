'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useId, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';
import { IconButton } from '../button/icon-button';

/**
 * Pagination — doc18 §15 (every Tabla Enterprise carries one) and §30
 * (last row of the standard page pattern).
 *
 * The prop names mirror the API contract in doc19 §6 exactly
 * (`page` / `pageSize` / `total`, with `pages` derived) so a listing screen
 * can forward `meta` straight into this component with no adapter layer.
 */
export interface PaginationProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'onChange'> {
  /** 1-based current page (doc19 §6 uses `?page=1`). */
  page: number;
  pageSize: number;
  /** Total records across every page, not the length of the current page. */
  total: number;
  onPageChange: (page: number) => void;
  /** Omit to hide the page-size control entirely. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/** Colombian grouping ("1.542"), consistent with the rest of the product. */
const numberFormatter = new Intl.NumberFormat('es-CO');

type PageToken = { kind: 'page'; value: number } | { kind: 'gap'; id: string };

/**
 * Builds a compact page list: first, last, the current page and one
 * neighbour on each side, with gaps in between. Keeps the control at a
 * fixed width no matter how many pages exist.
 */
function buildPageTokens(page: number, pages: number): PageToken[] {
  const windowed = new Set<number>([1, pages, page - 1, page, page + 1]);
  const visible = [...windowed]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);

  const tokens: PageToken[] = [];
  let previous = 0;

  for (const value of visible) {
    if (previous !== 0 && value - previous > 1) {
      tokens.push({ kind: 'gap', id: `gap-${previous}-${value}` });
    }
    tokens.push({ kind: 'page', value });
    previous = value;
  }

  return tokens;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  ...props
}: PaginationProps) {
  // `pages` is the derived field of the doc19 §6 `meta` envelope. It is
  // recomputed instead of accepted as a prop so the control can never
  // disagree with `total`/`pageSize`.
  const pages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const currentPage = Math.min(Math.max(page, 1), pages);

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= pages;

  const goTo = (target: number) => {
    const clamped = Math.min(Math.max(target, 1), pages);
    if (clamped !== currentPage) {
      onPageChange(clamped);
    }
  };

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        'flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between',
        className,
      )}
      {...props}
    >
      {/* `aria-live` announces the new range after a page change without
          moving focus away from the pagination control (doc18 §27). */}
      <p aria-live="polite" className="text-small text-foreground-muted">
        {total === 0
          ? 'Sin registros para mostrar'
          : `Mostrando ${numberFormatter.format(from)}–${numberFormatter.format(to)} de ${numberFormatter.format(total)}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange ? (
          <PageSizeControl
            pageSize={pageSize}
            options={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}

        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronsLeft}
            aria-label="Ir a la primera página"
            variant="ghost"
            disabled={isFirstPage}
            onClick={() => goTo(1)}
          />
          <IconButton
            icon={ChevronLeft}
            aria-label="Página anterior"
            variant="ghost"
            disabled={isFirstPage}
            onClick={() => goTo(currentPage - 1)}
          />

          {/* Numbered pages are noise on a phone: the compact indicator
              below replaces them under the tablet breakpoint. */}
          <span className="px-2 text-small text-foreground-muted tablet:hidden">
            Página {numberFormatter.format(currentPage)} de {numberFormatter.format(pages)}
          </span>

          <ul className="hidden items-center gap-1 tablet:flex">
            {buildPageTokens(currentPage, pages).map((token) =>
              token.kind === 'gap' ? (
                <li key={token.id} aria-hidden="true" className="px-1 text-foreground-muted">
                  …
                </li>
              ) : (
                <li key={token.value}>
                  <PageButton
                    value={token.value}
                    isCurrent={token.value === currentPage}
                    onSelect={goTo}
                  />
                </li>
              ),
            )}
          </ul>

          <IconButton
            icon={ChevronRight}
            aria-label="Página siguiente"
            variant="ghost"
            disabled={isLastPage}
            onClick={() => goTo(currentPage + 1)}
          />
          <IconButton
            icon={ChevronsRight}
            aria-label="Ir a la última página"
            variant="ghost"
            disabled={isLastPage}
            onClick={() => goTo(pages)}
          />
        </div>
      </div>
    </nav>
  );
}

interface PageButtonProps {
  value: number;
  isCurrent: boolean;
  onSelect: (page: number) => void;
}

function PageButton({ value, isCurrent, onSelect }: PageButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Ir a la página ${value}`}
      aria-current={isCurrent ? 'page' : undefined}
      onClick={() => onSelect(value)}
      className={cn(
        // 40 px square: comfortably above the minimum target size and
        // reachable with Tab like every other control here.
        'flex h-10 min-w-10 items-center justify-center rounded-md px-2',
        'text-small font-medium transition-colors duration-fast',
        isCurrent
          ? 'bg-primary-600 text-neutral-50'
          : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
      )}
    >
      {value}
    </button>
  );
}

interface PageSizeControlProps {
  pageSize: number;
  options: number[];
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Rendered as a toggle group rather than a dropdown: doc18 §12 forbids the
 * native HTML `<select>`, and a three-to-four option switch does not
 * justify pulling a full listbox into the pagination bar.
 */
function PageSizeControl({ pageSize, options, onPageSizeChange }: PageSizeControlProps) {
  // `useId` instead of a constant: two paginated tables can share a screen
  // and duplicate ids would break the `aria-labelledby` association.
  const labelId = useId();

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="text-small text-foreground-muted">
        Filas por página
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex items-center gap-1 rounded-md border border-border p-0.5"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === pageSize}
            aria-label={`Mostrar ${option} filas por página`}
            onClick={() => onPageSizeChange(option)}
            className={cn(
              'rounded-xs px-2 py-1 text-small font-medium transition-colors duration-fast',
              option === pageSize
                ? 'bg-primary-600 text-neutral-50'
                : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
