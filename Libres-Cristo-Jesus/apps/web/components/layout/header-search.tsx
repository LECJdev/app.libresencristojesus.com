'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, House, MapPin, Map as MapIcon, Search, UsersRound } from 'lucide-react';
import { Icon, Input, Loading, Popover, PopoverContent, PopoverTrigger, cn } from '@lcj/ui';
import type { SearchHit } from '@lcj/types';
import { searchOrganization } from '@/lib/api/organization';

/**
 * Global search trigger for the header (doc06 §12's search — the same
 * `GET /organizations/search` endpoint `<OrganizationSearch>` already uses
 * on the Organización page). No new backend call is introduced: this is a
 * second, compact presentation of the existing one, because the full
 * labelled-field version there does not fit a header's single row.
 *
 * The API needs 2+ characters and is debounced, matching the page-level
 * component so the two never feel like different products.
 */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

interface Group {
  key: string;
  label: string;
  icon: typeof House;
  hits: SearchHit[];
}

function HitRow({ hit, onNavigate }: { hit: SearchHit; onNavigate: () => void }) {
  const content = (
    <>
      <span className="truncate text-body text-foreground">{hit.title}</span>
      {hit.subtitle ? (
        <span className="truncate text-caption text-foreground-muted">{hit.subtitle}</span>
      ) : null}
    </>
  );

  const className = cn(
    'flex min-w-0 flex-col rounded-md px-3 py-2',
    hit.href ? 'transition-colors duration-fast hover:bg-surface-muted' : '',
  );

  // Catalog rows (municipalities, departments) have no screen of their own,
  // exactly as in `<OrganizationSearch>` — same reasoning, same behaviour.
  return hit.href ? (
    <Link href={hit.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(term.trim());
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [term]);

  const enabled = open && debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ['organization', 'search', 'header', debounced],
    enabled,
    queryFn: () => searchOrganization(debounced, 4),
    staleTime: 30 * 1000,
  });

  const groups = useMemo<Group[]>(() => {
    if (!data) {
      return [];
    }
    return [
      { key: 'districts', label: 'Distritos', icon: Building2, hits: data.districts },
      { key: 'peaceHouses', label: 'Casas de Paz', icon: House, hits: data.peaceHouses },
      { key: 'leaderships', label: 'Liderazgos', icon: UsersRound, hits: data.leaderships },
      { key: 'municipalities', label: 'Municipios', icon: MapPin, hits: data.municipalities },
      { key: 'departments', label: 'Departamentos', icon: MapIcon, hits: data.departments },
    ].filter((group) => group.hits.length > 0);
  }, [data]);

  return (
    <Popover open={open} onOpenChange={setOpen} className="hidden w-64 tablet:block desktop:w-80">
      <PopoverTrigger
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-md border border-border bg-surface-muted px-3',
          'text-small text-foreground-muted transition-colors duration-fast',
          'hover:border-neutral-400 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <Icon icon={Search} size="sm" />
        <span className="truncate">Buscar en la organización…</span>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-96 max-w-[90vw] p-0">
        <div className="p-3">
          <Input
            autoFocus
            leftIcon={Search}
            aria-label="Búsqueda global"
            placeholder="Distrito, Casa de Paz, líder, pastor, municipio o departamento…"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
            }}
          />
        </div>

        {debounced.length > 0 && debounced.length < MIN_QUERY_LENGTH ? (
          <p className="px-6 pb-3 text-caption text-foreground-muted">
            Escriba al menos {MIN_QUERY_LENGTH} caracteres.
          </p>
        ) : null}

        {enabled ? (
          <div className="max-h-80 overflow-y-auto border-t border-border px-1 pb-2 pt-2">
            {isFetching && !data ? (
              <div className="px-3 py-2">
                <Loading label="Buscando…" lines={3} />
              </div>
            ) : data && data.total === 0 ? (
              <p className="px-3 py-2 text-small text-foreground-muted">
                Sin resultados para <strong>{debounced}</strong>.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {groups.map((group) => (
                  <div key={group.key} className="flex flex-col gap-1">
                    <h3 className="flex items-center gap-2 px-3 text-caption font-semibold uppercase tracking-wide text-foreground-muted">
                      <Icon icon={group.icon} size="xs" />
                      {group.label}
                    </h3>
                    {group.hits.map((hit) => (
                      <HitRow
                        key={`${group.key}-${hit.id}`}
                        hit={hit}
                        onNavigate={() => {
                          setOpen(false);
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
