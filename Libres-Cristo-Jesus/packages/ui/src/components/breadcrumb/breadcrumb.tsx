'use client';

import { ChevronRight } from 'lucide-react';
import { Fragment, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../../lib/icon';

export interface BreadcrumbItem {
  /** Visible label — Spanish, supplied by the app. */
  label: string;
  /** Omit on the current page; the last item is never a link. */
  href?: string;
}

export interface BreadcrumbProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'onSelect'> {
  items: BreadcrumbItem[];
  /** Fired on click. The app owns the actual navigation. */
  onNavigate?: (item: BreadcrumbItem, index: number) => void;
}

/**
 * Breadcrumb — second row of the standard page pattern (doc18 §30).
 *
 * MOBILE COLLAPSE: below the tablet breakpoint only the first and last
 * crumbs stay visible and the middle ones are replaced by an ellipsis, so a
 * deep path (Distritos › Norte › Casas de Paz › Betania) never wraps onto
 * three lines on a phone. The collapsed crumbs remain in the DOM and are
 * merely display-hidden at that width, so assistive technology and larger
 * screens still get the full trail.
 */
export function Breadcrumb({ items, onNavigate, className, ...props }: BreadcrumbProps) {
  const lastIndex = items.length - 1;
  const hasCollapsedItems = items.length > 2;

  return (
    <nav aria-label="Ruta de navegación" className={cn('w-full', className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1 text-small text-foreground-muted">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === lastIndex;
          // Everything between the first and last crumb folds away on phones.
          const isCollapsible = !isFirst && !isLast;

          return (
            <Fragment key={`${item.label}-${index}`}>
              {index === 1 && hasCollapsedItems ? (
                // Visual stand-in for the folded crumbs, positioned between
                // the first and last. Hidden from assistive technology
                // because the real crumbs are still in the list.
                <li aria-hidden="true" className="flex items-center gap-1 tablet:hidden">
                  <Icon icon={ChevronRight} size="xs" />
                  <span>…</span>
                </li>
              ) : null}

              <li className={cn('flex items-center gap-1', isCollapsible && 'hidden tablet:flex')}>
                {!isFirst ? (
                  <Icon icon={ChevronRight} size="xs" className="text-foreground-muted" />
                ) : null}

                {isLast || item.href === undefined ? (
                  <span
                    // doc18 §27: the current location must be announced, not
                    // only styled differently.
                    aria-current={isLast ? 'page' : undefined}
                    className={cn('truncate', isLast && 'font-medium text-foreground')}
                  >
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    onClick={() => onNavigate?.(item, index)}
                    className={cn(
                      'truncate rounded-xs transition-colors duration-fast',
                      'hover:text-foreground hover:underline',
                    )}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
