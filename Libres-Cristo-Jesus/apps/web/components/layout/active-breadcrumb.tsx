'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumb, type BreadcrumbItem } from '@lcj/ui';
import { DEFAULT_AUTHENTICATED_ROUTE, findNavItemByPathname } from '@/lib/navigation';

/**
 * Breadcrumb for the "Header → Breadcrumb → Título + Acciones" page pattern
 * (doc18 §30) — the `breadcrumb` slot every `<PageHeader>` already exposes,
 * just never fed.
 *
 * Resolves the trail with the exact same `findNavItemByPathname` match
 * `<AppShell>` uses for the sidebar's active item and the header title, so
 * this can never name a different section for the same route than the rest
 * of the shell does.
 */
export function ActiveBreadcrumb() {
  const pathname = usePathname();
  const activeItem = findNavItemByPathname(pathname);

  if (!activeItem) {
    return null;
  }

  // The Dashboard IS "Inicio" — a "Inicio › Dashboard" trail would repeat
  // itself. Every other section gets the two-level trail back to it.
  const items: BreadcrumbItem[] =
    activeItem.id === 'dashboard'
      ? [{ label: activeItem.label }]
      : [{ label: 'Inicio', href: DEFAULT_AUTHENTICATED_ROUTE }, { label: activeItem.label }];

  return <Breadcrumb items={items} />;
}
