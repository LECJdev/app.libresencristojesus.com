'use client';

import { CalendarDays, History, MapPin, User } from 'lucide-react';
import {
  Avatar,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  EntityStatusBadge,
  Icon,
  Loading,
  cn,
} from '@lcj/ui';
import type { LeadershipHistoryEntry, PeaceHouse } from '@lcj/types';
import { usePeaceHouseLeadershipHistory } from '@/hooks/use-peace-houses';
import { toEntityStatus } from './mappers';
import { DetailRow } from './detail-row';

/**
 * Read-only detail of a Casa de Paz plus its leadership timeline
 * (doc06 §9 "Perfil de Liderazgo", §10 "Historial", §14 "Línea de Tiempo").
 *
 * A Drawer rather than a route: the user is scanning a list and wants the
 * detail without losing their filters, their page and their scroll
 * position — which a navigation would discard.
 */

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function memberNames(entry: LeadershipHistoryEntry): string {
  if (entry.members.length === 0) {
    return 'Sin miembros registrados';
  }
  return entry.members.map((member) => `${member.firstName} ${member.lastName}`.trim()).join(' y ');
}

export interface PeaceHouseDetailDrawerProps {
  peaceHouse: PeaceHouse | null;
  onOpenChange: (open: boolean) => void;
  /** Resolved names, since the record itself only carries ids. */
  districtName?: string;
  departmentName?: string;
  municipalityName?: string;
}

export function PeaceHouseDetailDrawer({
  peaceHouse,
  onOpenChange,
  districtName,
  departmentName,
  municipalityName,
}: PeaceHouseDetailDrawerProps) {
  const { data: history, isPending } = usePeaceHouseLeadershipHistory(peaceHouse?.id);

  const location = [municipalityName, departmentName].filter(Boolean).join(', ') || null;
  const schedule =
    [peaceHouse?.meetingDay, peaceHouse?.meetingHour].filter(Boolean).join(' · ') || null;
  const coordinates =
    peaceHouse?.latitude !== null &&
    peaceHouse?.latitude !== undefined &&
    peaceHouse.longitude !== null
      ? `${peaceHouse.latitude}, ${peaceHouse.longitude}`
      : null;

  return (
    <Drawer open={peaceHouse !== null} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        {peaceHouse ? (
          <>
            <DrawerHeader>
              <div className="flex items-start justify-between gap-3 pr-4">
                <DrawerTitle>{peaceHouse.name}</DrawerTitle>
                <EntityStatusBadge status={toEntityStatus(peaceHouse.status)} />
              </div>
              <DrawerDescription>
                {peaceHouse.code ? `Código ${peaceHouse.code}` : 'Sin código asignado'}
                {districtName ? ` · ${districtName}` : ''}
              </DrawerDescription>
            </DrawerHeader>

            <DrawerBody className="flex flex-col gap-6">
              <section className="flex flex-col gap-4">
                <DetailRow icon={MapPin} label="Ubicación" value={location} />
                <DetailRow icon={MapPin} label="Barrio" value={peaceHouse.neighborhood} />
                <DetailRow icon={MapPin} label="Dirección" value={peaceHouse.address} />
                <DetailRow icon={CalendarDays} label="Reunión" value={schedule} />
                <DetailRow icon={MapPin} label="Coordenadas" value={coordinates} />
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                  <Icon icon={History} size="sm" />
                  Historial de liderazgo
                </h3>

                {isPending ? (
                  <Loading label="Cargando historial…" lines={3} />
                ) : !history || history.length === 0 ? (
                  <p className="text-small text-foreground-muted">
                    Todavía no hay registros de liderazgo para esta Casa de Paz.
                  </p>
                ) : (
                  // A vertical timeline: the open period (no endDate) is the
                  // current leadership and is marked as such, because "who
                  // leads this today" is the question this panel answers first.
                  <ol className="flex flex-col gap-4 border-l border-border pl-5">
                    {history.map((entry) => {
                      const isCurrent = entry.endDate === null;
                      return (
                        <li key={entry.id} className="relative flex flex-col gap-1">
                          <span
                            aria-hidden="true"
                            className={cn(
                              'absolute -left-[26px] top-1 size-3 rounded-full ring-4 ring-surface',
                              isCurrent ? 'bg-primary-600' : 'bg-neutral-300',
                            )}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.members[0]?.photo ? (
                              <Avatar
                                src={entry.members[0].photo}
                                name={memberNames(entry)}
                                size="xs"
                              />
                            ) : (
                              <Icon icon={User} size="xs" className="text-foreground-muted" />
                            )}
                            <span className="text-body font-medium text-foreground">
                              {memberNames(entry)}
                            </span>
                            {isCurrent ? (
                              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-caption font-semibold text-primary-800">
                                Actual
                              </span>
                            ) : null}
                          </div>
                          <p className="text-caption text-foreground-muted">
                            {formatDate(entry.startDate)}
                            {entry.endDate ? ` — ${formatDate(entry.endDate)}` : ' — presente'}
                          </p>
                          {entry.reason ? (
                            <p className="text-small text-foreground-muted">{entry.reason}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </DrawerBody>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
