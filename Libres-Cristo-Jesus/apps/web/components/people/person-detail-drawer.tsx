'use client';

import { CalendarDays, History, House, IdCard, Mail, MapPin, Phone } from 'lucide-react';
import {
  Avatar,
  Badge,
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
import type { Person } from '@lcj/types';
import { usePersonHistory } from '@/hooks/use-people';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { toEntityStatus } from '@/components/organization/mappers';

/**
 * Read-only detail of a person plus their Casa de Paz timeline
 * (doc04 §5 — "una de las tablas más importantes": where they were, and
 * when they moved).
 *
 * A Drawer rather than a route: the user is scanning a roster and wants the
 * detail without losing their filters, page and scroll position.
 */

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-foreground-muted">
        <Icon icon={icon} size="sm" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-caption text-foreground-muted">{label}</span>
        <span className="break-words text-body text-foreground">{value ?? 'Sin registrar'}</span>
      </div>
    </div>
  );
}

export interface PersonDetailDrawerProps {
  person: Person | null;
  onOpenChange: (open: boolean) => void;
  /** Resolved name of the current Casa de Paz, since the record holds an id. */
  peaceHouseName?: string;
}

export function PersonDetailDrawer({
  person,
  onOpenChange,
  peaceHouseName,
}: PersonDetailDrawerProps) {
  const { data: history, isPending } = usePersonHistory(person?.id);
  const photo = useStoredFilePreview(person?.photo);

  const fullName = person ? `${person.firstName} ${person.lastName}`.trim() : '';

  return (
    <Drawer open={person !== null} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="md">
        {person ? (
          <>
            <DrawerHeader>
              <div className="flex items-start gap-3 pr-8">
                <Avatar src={photo ?? undefined} name={fullName} size="lg" />
                <div className="flex min-w-0 flex-col gap-1">
                  <DrawerTitle>{fullName}</DrawerTitle>
                  <DrawerDescription>
                    {peaceHouseName ?? 'Sin Casa de Paz asignada'}
                  </DrawerDescription>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <EntityStatusBadge status={toEntityStatus(person.status)} />
                    {person.personStageName ? (
                      <Badge variant="info">{person.personStageName}</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </DrawerHeader>

            <DrawerBody className="flex flex-col gap-6">
              <section className="flex flex-col gap-4">
                <DetailRow icon={IdCard} label="Documento" value={person.document} />
                <DetailRow icon={Phone} label="Celular" value={person.phone} />
                <DetailRow icon={Mail} label="Correo" value={person.email} />
                <DetailRow
                  icon={CalendarDays}
                  label="Fecha de nacimiento"
                  value={person.birthDate ? formatDate(person.birthDate) : null}
                />
                <DetailRow icon={MapPin} label="Dirección" value={person.address} />
              </section>

              {person.notes ? (
                <section className="flex flex-col gap-1">
                  <h3 className="text-caption font-semibold uppercase tracking-wide text-foreground-muted">
                    Observaciones
                  </h3>
                  <p className="whitespace-pre-wrap text-body text-foreground">{person.notes}</p>
                </section>
              ) : null}

              <section className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                  <Icon icon={History} size="sm" />
                  Historial de Casas de Paz
                </h3>

                {isPending ? (
                  <Loading label="Cargando historial…" lines={3} />
                ) : !history || history.length === 0 ? (
                  <p className="flex items-center gap-2 text-small text-foreground-muted">
                    <Icon icon={House} size="xs" />
                    Todavía no se ha vinculado a ninguna Casa de Paz.
                  </p>
                ) : (
                  // Vertical timeline. The open period (no endDate) is the
                  // current membership and is marked as such, because "where
                  // is she now" is the question this panel answers first.
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
                            <span className="text-body font-medium text-foreground">
                              {entry.peaceHouseName}
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
