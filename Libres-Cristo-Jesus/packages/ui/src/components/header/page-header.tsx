'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface PageHeaderProps extends ComponentPropsWithoutRef<'div'> {
  /** Page title. Rendered as `<h1>` — one per page. */
  title: string;
  /** Optional supporting line under the title. */
  description?: string;
  /** Primary/secondary buttons for this page. */
  actions?: ReactNode;
  /** Slot for `<Breadcrumb>`; sits above the title per doc18 §30. */
  breadcrumb?: ReactNode;
}

/**
 * PageHeader — the "Breadcrumb → Título + Acciones" block of the standard
 * page pattern (doc18 §30):
 *
 *   Header → Breadcrumb → Título + Acciones → Filtros → KPIs →
 *   Contenido → Paginación
 *
 * Bundling the breadcrumb with the title keeps that vertical order
 * impossible to get wrong from a screen, which is the whole point of the
 * pattern ("crea una experiencia consistente en toda la aplicación").
 *
 * Actions stack under the title on mobile and move to the right edge from
 * tablet up, so a long title never squeezes the buttons on a phone.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      {breadcrumb}

      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-h3 font-semibold text-foreground desktop:text-h2">{title}</h1>
          {description ? <p className="text-small text-foreground-muted">{description}</p> : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
