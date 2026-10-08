'use client';

import { Check, Columns3 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

export interface DataTableColumnOption {
  id: string;
  label: string;
}

export interface DataTableColumnsMenuProps {
  columns: DataTableColumnOption[];
  hiddenColumnIds: string[];
  onToggle: (columnId: string) => void;
}

/**
 * "Columnas configurables" control required of every table by doc18 §15.
 *
 * Implemented as a self-contained disclosure instead of a dropdown
 * primitive because `@radix-ui/react-dropdown-menu` is not a dependency of
 * this package and pulling one in for a single toggle list is not worth the
 * bundle. Accessibility is covered explicitly: `aria-expanded` on the
 * trigger, `role="menuitemcheckbox"` + `aria-checked` on each entry,
 * Escape to close and focus returned to the trigger.
 */
export function DataTableColumnsMenu({
  columns,
  hiddenColumnIds,
  onToggle,
}: DataTableColumnsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target) === false) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        // Returning focus keeps keyboard users where they were (doc18 §27).
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3',
          'text-small font-medium text-foreground transition-colors duration-fast',
          'hover:bg-surface-muted',
        )}
      >
        <Icon icon={Columns3} size="xs" />
        Columnas
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Columnas visibles"
          className={cn(
            'absolute right-0 z-20 mt-1 flex w-56 flex-col gap-0.5',
            'rounded-md border border-border bg-surface p-1 shadow-lg',
          )}
        >
          {columns.map((column) => {
            const isVisible = !hiddenColumnIds.includes(column.id);

            return (
              <button
                key={column.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isVisible}
                onClick={() => onToggle(column.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xs px-2 py-2 text-left text-small',
                  'transition-colors duration-fast hover:bg-surface-muted',
                )}
              >
                {/* The check is decorative: `aria-checked` above is what
                    assistive technology reads, so state never depends on
                    the glyph alone. */}
                <span className="flex w-5 justify-center">
                  {isVisible ? <Icon icon={Check} size="xs" className="text-primary-600" /> : null}
                </span>
                <span className="truncate">{column.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
