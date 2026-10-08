'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarDays, Phone, UsersRound } from 'lucide-react';
import {
  Avatar,
  Button,
  Container,
  EmptyState,
  EntityStatusBadge,
  Grid,
  GridItem,
  Icon,
  KPICard,
  Loading,
  PageHeader,
} from '@lcj/ui';
import { useOrganizationTree } from '@/hooks/use-organization-tree';
import { usePerson, usePersonAttendance } from '@/hooks/use-people';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { toEntityStatus } from '@/components/organization/mappers';
import { AttendanceRateTrend } from '@/components/organization/attendance-rate-trend';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';

/**
 * Detalle de una Persona — abierta desde la grilla de Personas de una Casa
 * de Paz (`/casas-de-paz/[id]`), mismo patrón de página completa (no
 * Drawer) que esa pantalla.
 *
 * La gráfica es la MISMA `AttendanceRateTrend` que usa la Casa de Paz: cada
 * reunión de la persona se mapea a `rate: 100` (presente) o `rate: 0`
 * (ausente), así que promediar por mes/año da exactamente "% de reuniones a
 * las que asistió" sin ningún código de agregación nuevo.
 */
export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: person, isPending: isPersonPending, isError, error, refetch } = usePerson(id);
  const { data: attendanceRows, isPending: isAttendancePending } = usePersonAttendance(id);
  const { data: tree } = useOrganizationTree();

  const photo = useStoredFilePreview(person?.photo);

  const peaceHouseLabel = useMemo(() => {
    if (!person?.currentPeaceHouseId) {
      return undefined;
    }
    for (const district of tree?.districts ?? []) {
      const found = district.peaceHouses.find(
        (candidate) => candidate.id === person.currentPeaceHouseId,
      );
      if (found) {
        return `${found.name} · D${district.number} ${district.name}`;
      }
    }
    return undefined;
  }, [tree, person?.currentPeaceHouseId]);

  const rows = attendanceRows ?? [];
  const totalMeetings = rows.length;
  const presentCount = rows.filter((row) => row.present).length;
  const overallRate =
    totalMeetings === 0 ? null : Math.round((presentCount / totalMeetings) * 1000) / 10;

  const trendRows = rows.map((row) => ({
    meetingDate: row.meetingDate,
    rate: row.present ? 100 : 0,
  }));

  const fullName = person ? `${person.firstName} ${person.lastName}`.trim() : '';

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title={fullName || 'Persona'}
        description={peaceHouseLabel}
        actions={
          <div className="flex items-center gap-3">
            {person ? <EntityStatusBadge status={toEntityStatus(person.status)} /> : null}
            <Button
              variant="secondary"
              leftIcon={ArrowLeft}
              onClick={() => {
                router.back();
              }}
            >
              Volver
            </Button>
          </div>
        }
      />

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible cargar la persona"
          description={error.message}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              Reintentar
            </Button>
          }
        />
      ) : null}

      {isPersonPending ? <Loading label="Cargando persona…" lines={6} /> : null}

      {person ? (
        <>
          <div className="flex items-center gap-4 rounded-lg border border-border p-4">
            <Avatar src={photo ?? undefined} name={fullName} size="xl" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-body font-semibold text-foreground">{fullName}</p>
              {person.personStageName ? (
                <p className="truncate text-caption text-foreground-muted">
                  {person.personStageName}
                </p>
              ) : null}
              {person.phone ? (
                <p className="flex items-center gap-1 text-caption text-foreground-muted">
                  <Icon icon={Phone} size="xs" />
                  {person.phone}
                </p>
              ) : null}
            </div>
          </div>

          <Grid>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 6 }}>
              <KPICard
                label="Reuniones desde que ingresó"
                icon={CalendarDays}
                loading={isAttendancePending}
                value={totalMeetings > 0 ? String(totalMeetings) : '—'}
              />
            </GridItem>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 6 }}>
              <KPICard
                label="% Asistencia"
                icon={UsersRound}
                loading={isAttendancePending}
                value={overallRate !== null ? `${overallRate} %` : '—'}
              />
            </GridItem>
          </Grid>

          <AttendanceRateTrend rows={trendRows} />
        </>
      ) : null}
    </Container>
  );
}
