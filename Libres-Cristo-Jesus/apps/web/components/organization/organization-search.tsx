'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, House, MapPin, Map as MapIcon, Search, UsersRound } from 'lucide-react';
import { Icon, Input, Loading, cn } from '@lcj/ui';
import type { SearchHit } from '@lcj/types';
import { searchOrganization } from '@/lib/api/organization';
import type { FocusableKind } from '@/components/organization/chart/organigrama-chart';

/**
 * Global search of the Organización module (doc06 §12: "Distrito, Casa,
 * Líder, Pastor, Municipio, Departamento").
 *
 * One input, results grouped by kind. The API decides what the caller is
 * allowed to find, so this component never filters anything itself — a
 * client-side filter over results the server already sent would mean the
 * data reached the browser in the first place.
 */

/** The API needs 2+ characters; below that no request is worth sending. */
const MIN_QUERY_LENGTH = 2;

/**
 * Debounce before querying. 300 ms is the interval where a search feels
 * instant but a person typing "esperanza" produces one request instead of
 * nine.
 */
const DEBOUNCE_MS = 300;

type GroupKey = FocusableKind | 'municipalities' | 'departments';

interface Group {
  key: GroupKey;
  label: string;
  icon: typeof House;
  hits: SearchHit[];
}

const FOCUSABLE_KEYS: ReadonlySet<GroupKey> = new Set<GroupKey>([
  'districts',
  'peaceHouses',
  'leaderships',
]);

function HitRow({
  hit,
  kind,
  onSelectEntity,
}: {
  hit: SearchHit;
  kind: GroupKey;
  onSelectEntity?: (hit: SearchHit, kind: FocusableKind) => void;
}) {
  const content = (
    <>
      <span className="truncate text-body text-foreground">{hit.title}</span>
      {hit.subtitle ? (
        <span className="truncate text-caption text-foreground-muted">{hit.subtitle}</span>
      ) : null}
    </>
  );

  const className = cn(
    'flex min-w-0 flex-col rounded-md px-3 py-2 text-left',
    'transition-colors duration-fast hover:bg-surface-muted',
  );

  // Districts/Casas de Paz/Liderazgos are all drawn as nodes in the
  // organigrama below — selecting one centres the diagram on it instead of
  // navigating away, so the person never loses the tree they were reading.
  if (onSelectEntity && FOCUSABLE_KEYS.has(kind)) {
    return (
      <button
        type="button"
        onClick={() => {
          onSelectEntity(hit, kind as FocusableKind);
        }}
        className={className}
      >
        {content}
      </button>
    );
  }

  // Catalog rows (municipalities, departments) have no screen of their own
  // and no node in the diagram. Rendering them as links to nowhere would be
  // a promise the UI cannot keep.
  return hit.href ? (
    <Link href={hit.href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={cn(className, 'hover:bg-transparent')}>{content}</div>
  );
}

export interface OrganizationSearchProps {
  /**
   * When provided, selecting a Distrito/Casa de Paz/Liderazgo hit calls this
   * instead of navigating to its detail screen — the organigrama below uses
   * it to centre and highlight the matching node (doc06 §12: "el buscador
   * global"). Omit to keep the plain navigate-away behaviour.
   */
  onSelectEntity?: (hit: SearchHit, kind: FocusableKind) => void;
}

export function OrganizationSearch({ onSelectEntity }: OrganizationSearchProps = {}) {
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

  const enabled = debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ['organization', 'search', debounced],
    enabled,
    queryFn: () => searchOrganization(debounced),
    // Results are cheap to recompute and go stale as soon as anything is
    // edited; caching them longer would show a house that was just renamed.
    staleTime: 30 * 1000,
  });

  const groups = useMemo<Group[]>(() => {
    if (!data) {
      return [];
    }
    const allGroups: Group[] = [
      { key: 'districts', label: 'Distritos', icon: Building2, hits: data.districts },
      { key: 'peaceHouses', label: 'Casas de Paz', icon: House, hits: data.peaceHouses },
      { key: 'leaderships', label: 'Liderazgos', icon: UsersRound, hits: data.leaderships },
      { key: 'municipalities', label: 'Municipios', icon: MapPin, hits: data.municipalities },
      { key: 'departments', label: 'Departamentos', icon: MapIcon, hits: data.departments },
    ];
    return allGroups.filter((group) => group.hits.length > 0);
  }, [data]);

  return (
    <section className="flex flex-col gap-3">
      <Input
        label="Búsqueda global"
        leftIcon={Search}
        placeholder="Distrito, Casa de Paz, líder, pastor, municipio o departamento…"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
        }}
        helperText={
          term.trim().length > 0 && term.trim().length < MIN_QUERY_LENGTH
            ? `Escriba al menos ${MIN_QUERY_LENGTH} caracteres.`
            : undefined
        }
      />

      {enabled ? (
        <div className="rounded-lg border border-border bg-surface p-3">
          {isFetching && !data ? (
            <Loading label="Buscando…" lines={3} />
          ) : data && data.total === 0 ? (
            <p className="px-3 py-2 text-small text-foreground-muted">
              Sin resultados para <strong>{debounced}</strong>.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
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
                      kind={group.key}
                      onSelectEntity={onSelectEntity}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
