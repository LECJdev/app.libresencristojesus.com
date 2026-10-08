'use client';

import { Baby, Network, UserRound, Users } from 'lucide-react';
import { Avatar, Card, DomainCard, EntityStatusBadge, Icon } from '@lcj/ui';
import type { KidsAssignment, KidsSchool, KidsSchoolMetrics } from '@lcj/types';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { toEntityStatus } from '@/components/organization/mappers';
import { ConnectorBar, ConnectorStub } from '@/components/organization/chart/connector';

/**
 * Organigrama propio de Escuela Kids — visualmente hermano del organigrama
 * de Casas de Paz (mismas piezas de `@lcj/ui` y los conectores decorativos
 * de `components/organization/chart/connector.tsx`, que son puro CSS sin
 * ningún dato de Casas de Paz), pero en su propio árbol y su propia ruta.
 * No importa nada de `organigrama-chart.tsx` ni toca esos archivos: la
 * jerarquía de Kids (sede → líder → auxiliares) es más simple que la de
 * Distritos/Casas de Paz y no necesita expandir/colapsar ni foco.
 */

interface StatItemProps {
  icon: typeof Network;
  value: number;
  label: string;
}

function StatItem({ icon, value, label }: StatItemProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
        <Icon icon={icon} size="sm" />
      </span>
      <div className="flex flex-col">
        <span className="text-body font-bold text-foreground">{value}</span>
        <span className="text-caption text-foreground-muted">{label}</span>
      </div>
    </div>
  );
}

export interface KidsOrganigramaRootCardProps {
  schoolCount: number;
  leaderCount: number;
  assistantCount: number;
  childCount: number;
}

/**
 * `childCount`/`leaderCount`/`assistantCount` are sums the page already has
 * once its per-school assignment/metrics queries resolve — never fabricated
 * here, and simply omitted (rendered as 0) while those are still pending.
 */
export function KidsOrganigramaRootCard({
  schoolCount,
  leaderCount,
  assistantCount,
  childCount,
}: KidsOrganigramaRootCardProps) {
  return (
    <Card id="kids-organigrama-root" className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 tablet:size-20">
          <Icon icon={Baby} size="lg" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-h4 font-semibold text-foreground">Escuela Kids</span>
          <span className="text-small text-foreground-muted">
            Estructura de sedes, líderes y auxiliares
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-t border-border pt-4">
        <StatItem icon={Network} value={schoolCount} label="Sedes" />
        <StatItem icon={UserRound} value={leaderCount} label="Líderes" />
        <StatItem icon={Users} value={assistantCount} label="Auxiliares" />
        <StatItem icon={Baby} value={childCount} label="Niños" />
      </div>
    </Card>
  );
}

export interface KidsOrganigramaStaffEntry {
  assignment: KidsAssignment;
  name: string;
  photo: string | null;
}

/** Resolves a stored photo path to a displayable `src` — kept as its own
 * component because `useStoredFilePreview` is a hook and each staff tile
 * needs its own independent resolution. */
function StaffAvatar({ name, photo, size }: { name: string; photo: string | null; size: 'sm' | 'md' }) {
  const src = useStoredFilePreview(photo);
  return <Avatar src={src ?? undefined} name={name} size={size} />;
}

export interface KidsOrganigramaSchoolCardProps {
  school: KidsSchool;
  metrics: KidsSchoolMetrics | undefined;
  leader: KidsOrganigramaStaffEntry | null;
  assistants: KidsOrganigramaStaffEntry[];
  /** Navigates to `/kids/[id]` — the sede detail page. Omit for a read-only card. */
  onClick?: () => void;
}

/**
 * One sede, its leader and its assistants, stacked as its own small tree —
 * the whole thing is one card in the row hanging off the root, since Kids
 * has no further nesting below "sede" the way Distrito → Casa de Paz does.
 *
 * The sede card itself is a `DomainCard` (clickable, keyboard-activatable —
 * same shell every other domain card in the app uses) so it can open
 * `/kids/[id]`. Only the sede card is interactive: leader/auxiliar tiles
 * below have no detail page of their own, so they stay plain.
 */
export function KidsOrganigramaSchoolCard({
  school,
  metrics,
  leader,
  assistants,
  onClick,
}: KidsOrganigramaSchoolCardProps) {
  return (
    <div className="flex flex-col items-center gap-0">
      <ConnectorStub size="sm" />

      <DomainCard onClick={onClick} className="w-80 gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-h4 font-semibold text-foreground">{school.name}</p>
            {metrics ? (
              <p className="truncate text-caption text-foreground-muted">
                {metrics.totalChildren} {metrics.totalChildren === 1 ? 'niño' : 'niños'}
              </p>
            ) : null}
          </div>
          <EntityStatusBadge status={toEntityStatus(school.status)} />
        </div>

        {leader ? (
          <div className="flex items-center gap-3">
            <StaffAvatar name={leader.name} photo={leader.photo} size="md" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-body font-semibold text-foreground">
                {leader.name}
              </span>
              <span className="text-caption text-foreground-muted">Líder de sede</span>
            </div>
          </div>
        ) : (
          <p className="text-caption text-foreground-muted">Sin líder asignado.</p>
        )}
      </DomainCard>

      {assistants.length > 0 ? (
        <>
          <ConnectorStub size="sm" />
          <ConnectorBar className="flex flex-wrap justify-center gap-3">
            {assistants.map((entry) => (
              <div
                key={entry.assignment.id}
                className="flex w-40 flex-col items-center gap-1 rounded-lg border border-border p-3 text-center"
              >
                <StaffAvatar name={entry.name} photo={entry.photo} size="md" />
                <span className="w-full truncate text-caption font-medium text-foreground">
                  {entry.name}
                </span>
              </div>
            ))}
          </ConnectorBar>
        </>
      ) : null}
    </div>
  );
}
