'use client';

import type { LucideIcon } from 'lucide-react';
import { House, Network, Users } from 'lucide-react';
import { Avatar, Card, EntityStatusBadge, Icon } from '@lcj/ui';
import {
  leadershipDisplayName,
  type OrganizationSummary,
  type LeadershipSummary,
} from '@lcj/types';
import { BrandMark } from '@/components/layout/app-brand';
import { toLeadershipEntityStatus } from '../mappers';
import { useResolvedCardLeaders } from '../use-resolved-photo';

function StatItem({ icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
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

/**
 * One Pastor General leadership unit — up to 2 members (a couple), each
 * shown with their OWN photo side by side, not the overlapping
 * `LeadersRow` treatment other cards use: this is the chart's hero card,
 * and both members should read clearly at a glance.
 */
function GeneralPastorEntry({ pastor }: { pastor: LeadershipSummary }) {
  const leaders = useResolvedCardLeaders(pastor) ?? [];

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {leaders.map((leader, index) => (
          <Avatar
            key={`${pastor.id}-${index}`}
            src={leader.photo}
            name={leader.name}
            size="xl"
            className="size-[72px] ring-2 ring-surface"
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-h4 font-semibold text-foreground">
          {leadershipDisplayName(pastor)}
        </span>
        <span className="text-small text-foreground-muted">{pastor.role}</span>
        <EntityStatusBadge status={toLeadershipEntityStatus(pastor.status)} />
      </div>
    </div>
  );
}

/**
 * The root of the chart: the institutional logo plus the Pastor(es)
 * General(es), with the church-wide structural indicators underneath.
 *
 * Only 3 of the "4 indicadores" the brief sketches are shown — Distritos /
 * Casas de Paz / Liderazgos, straight from `OrganizationTree.summary`. The
 * 4th ("Personas") is deliberately omitted here: `OrganizationTree` carries
 * no church-wide person count, and fabricating one (or summing every Casa
 * de Paz's on-demand headcount just for this one number) is exactly the
 * invented figure the brief asks to avoid.
 */
export interface GeneralPastorsCardProps {
  generalPastors: LeadershipSummary[];
  summary: OrganizationSummary;
}

export function GeneralPastorsCard({ generalPastors, summary }: GeneralPastorsCardProps) {
  return (
    <Card id="general-pastors-card" interactive className="flex flex-col gap-6 p-6">
      <div className="flex flex-col items-start gap-6 tablet:flex-row tablet:items-center">
        <BrandMark className="size-16 shrink-0 tablet:size-20" />

        {generalPastors.length === 0 ? (
          <p className="text-small text-foreground-muted">Sin Pastor General asignado.</p>
        ) : (
          <div className="flex flex-1 flex-wrap gap-6">
            {generalPastors.map((pastor) => (
              <GeneralPastorEntry key={pastor.id} pastor={pastor} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-6 border-t border-border pt-4">
        <StatItem icon={Network} value={summary.districts} label="Distritos" />
        <StatItem icon={House} value={summary.peaceHouses} label="Casas de Paz" />
        <StatItem icon={Users} value={summary.leaderships} label="Liderazgos" />
      </div>
    </Card>
  );
}
