'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Hash,
  MapPin,
  Phone,
  Users,
  UsersRound,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Container,
  DataTable,
  EmptyState,
  EntityStatusBadge,
  Grid,
  GridItem,
  Icon,
  KPICard,
  Loading,
  PageHeader,
  PersonCard,
  type DataTableColumn,
} from '@lcj/ui';
import type { LeadershipMemberSummary } from '@lcj/types';
import { useOrganizationTree } from '@/hooks/use-organization-tree';
import { usePeaceHouseDetail } from '@/components/organization/chart/use-peace-house-detail';
import { useStoredFilePreview } from '@/hooks/use-file-upload';
import { useAttendanceRates, usePeople } from '@/hooks/use-people';
import { useReportPreview } from '@/hooks/use-reports';
import { toEntityStatus } from '@/components/organization/mappers';
import { DetailRow } from '@/components/organization/detail-row';
import { AttendanceRateTrend } from '@/components/organization/attendance-rate-trend';
import { ActiveBreadcrumb } from '@/components/layout/active-breadcrumb';
import { formatDate, formatNumber } from '@/lib/format';

const ATTENDANCE_PAGE_SIZE = 8;
/** Casas de Paz are small groups by design — one page comfortably lists them all. */
const PEOPLE_PAGE_SIZE = 100;
/** Ceiling allowed by `PaginationQueryDto` (`@Max(100)`) — enough weekly points for a week/month/year trend. */
const ATTENDANCE_TREND_PAGE_SIZE = 100;

type ReportCellFormat = 'text' | 'number' | 'currency' | 'date';

function renderReportCell(value: string | number | null, format: ReportCellFormat): string {
  if (value === null || value === '') {
    return '—';
  }
  if (format === 'date' && typeof value === 'string') {
    return formatDate(value);
  }
  if (format === 'number' && typeof value === 'number') {
    return formatNumber(value);
  }
  return String(value);
}

function LeaderTile({ member, role }: { member: LeadershipMemberSummary; role: string }) {
  const photo = useStoredFilePreview(member.photo);
  const name = `${member.firstName} ${member.lastName}`.trim();

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-4">
      <Avatar src={photo ?? undefined} name={name} size="xl" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body font-semibold text-foreground">{name}</p>
        <p className="truncate text-caption text-foreground-muted">{role}</p>
        {member.phone ? (
          <p className="flex items-center gap-1 text-caption text-foreground-muted">
            <Icon icon={Phone} size="xs" />
            {member.phone}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Full detail of a Casa de Paz — a route, not a Drawer.
 *
 * Replaces the old side panel (`PeaceHouseDetailDrawer`, still used from the
 * `/casas-de-paz` list's own "Ver" button): that panel only had room for
 * address/schedule/leadership-history and read poorly on a phone. This
 * screen has enough content — both leaders with photo and name, the Casa de
 * Paz's own information, its people, and its attendance history — to
 * deserve a real page with a back button instead of fighting a fixed-width
 * panel for space.
 */
export default function PeaceHouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const {
    data: peaceHouse,
    isPending: isPeaceHousePending,
    isError,
    error,
    refetch,
  } = usePeaceHouseDetail(id);
  const { data: tree } = useOrganizationTree();

  const { node, districtLabel } = useMemo(() => {
    for (const district of tree?.districts ?? []) {
      const found = district.peaceHouses.find((candidate) => candidate.id === id);
      if (found) {
        return { node: found, districtLabel: `D${district.number} · ${district.name}` };
      }
    }
    return { node: undefined, districtLabel: undefined };
  }, [tree, id]);

  const { data: peopleData, isPending: isPeoplePending } = usePeople({
    peaceHouseId: id,
    pageSize: PEOPLE_PAGE_SIZE,
    sort: 'firstName',
    order: 'asc',
  });

  const { data: attendanceRates } = useAttendanceRates(id);
  const rateByPersonId = new Map(
    (attendanceRates ?? []).map((entry) => [entry.personId, entry.rate]),
  );

  const { data: attendanceData, isPending: isAttendancePending } = useReportPreview('attendance', {
    peaceHouseId: id,
    page: 1,
    pageSize: ATTENDANCE_PAGE_SIZE,
  });

  const { data: trendData } = useReportPreview('attendance', {
    peaceHouseId: id,
    page: 1,
    pageSize: ATTENDANCE_TREND_PAGE_SIZE,
  });
  const trendRows = (trendData?.data.rows ?? []).flatMap((row) =>
    typeof row.meetingDate === 'string' && typeof row.rate === 'number'
      ? [{ meetingDate: row.meetingDate, rate: row.rate }]
      : [],
  );

  const attendanceRows = attendanceData?.data.rows ?? [];
  const lastMeeting = attendanceRows[0];
  const lastPresent = typeof lastMeeting?.present === 'number' ? lastMeeting.present : null;
  const lastRoster = typeof lastMeeting?.roster === 'number' ? lastMeeting.roster : null;
  const lastRate = typeof lastMeeting?.rate === 'number' ? lastMeeting.rate : null;

  const attendanceColumns: DataTableColumn<Record<string, string | number | null>>[] = (
    attendanceData?.data.columns ?? []
  ).map((column) => ({
    id: column.key,
    header: column.header,
    className: column.format === 'number' ? 'text-right tabular-nums' : undefined,
    headerClassName: column.format === 'number' ? 'text-right' : undefined,
    accessor: (row) => renderReportCell(row[column.key] ?? null, column.format),
  }));

  const location =
    [node?.municipalityName, node?.departmentName].filter(Boolean).join(', ') || null;
  const schedule =
    [peaceHouse?.meetingDay, peaceHouse?.meetingHour].filter(Boolean).join(' · ') || null;
  const coordinates =
    peaceHouse?.latitude !== null &&
    peaceHouse?.latitude !== undefined &&
    peaceHouse?.longitude !== null &&
    peaceHouse?.longitude !== undefined
      ? `${peaceHouse.latitude}, ${peaceHouse.longitude}`
      : null;

  return (
    <Container size="lg" className="flex flex-col gap-6 pb-8">
      <PageHeader
        breadcrumb={<ActiveBreadcrumb />}
        title={peaceHouse?.name ?? node?.name ?? 'Casa de Paz'}
        description={districtLabel}
        actions={
          <div className="flex items-center gap-3">
            {peaceHouse ? <EntityStatusBadge status={toEntityStatus(peaceHouse.status)} /> : null}
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
          title="No fue posible cargar la Casa de Paz"
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

      {isPeaceHousePending ? <Loading label="Cargando Casa de Paz…" lines={6} /> : null}

      {peaceHouse ? (
        <>
          <Grid>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 6 }}>
              <KPICard
                label="Personas en la Casa de Paz"
                icon={Users}
                loading={isPeoplePending}
                value={peopleData ? formatNumber(peopleData.meta.total) : '—'}
              />
            </GridItem>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 6 }}>
              <KPICard
                label="Reuniones registradas"
                icon={CalendarDays}
                loading={isAttendancePending}
                value={attendanceData ? formatNumber(attendanceData.meta.total) : '—'}
              />
            </GridItem>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 6 }}>
              <KPICard
                label="Asistentes última reunión"
                icon={UsersRound}
                loading={isAttendancePending}
                value={
                  lastPresent !== null && lastRoster !== null
                    ? `${lastPresent} de ${lastRoster}`
                    : '—'
                }
              />
            </GridItem>
            <GridItem cols={{ mobile: 4, tablet: 4, desktop: 6 }}>
              <KPICard
                label="% Asistencia última reunión"
                icon={UsersRound}
                loading={isAttendancePending}
                value={lastRate !== null ? `${lastRate} %` : '—'}
              />
            </GridItem>
          </Grid>

          <AttendanceRateTrend rows={trendRows} />

          {node?.leadership && node.leadership.members.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-h4 font-semibold text-foreground">Liderazgo</h2>
              <div className="grid gap-3 tablet:grid-cols-2">
                {node.leadership.members.map((member) => (
                  <LeaderTile key={member.id} member={member} role={node.leadership!.role} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-h4 font-semibold text-foreground">Información de la Casa de Paz</h2>
            <div className="grid gap-4 rounded-lg border border-border p-4 tablet:grid-cols-2">
              <DetailRow icon={Hash} label="Código" value={peaceHouse.code} />
              <DetailRow icon={MapPin} label="Ubicación" value={location} />
              <DetailRow icon={MapPin} label="Barrio" value={peaceHouse.neighborhood} />
              <DetailRow icon={MapPin} label="Dirección" value={peaceHouse.address} />
              <DetailRow icon={CalendarDays} label="Reunión" value={schedule} />
              <DetailRow icon={MapPin} label="Coordenadas" value={coordinates} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h4 font-semibold text-foreground">Historial de asistencia</h2>
            <DataTable
              caption="Últimas reuniones"
              columns={attendanceColumns}
              rows={attendanceRows}
              getRowId={(_row, index) => String(index)}
              loading={isAttendancePending}
              emptyState={
                <EmptyState
                  icon={CalendarDays}
                  title="Sin reuniones registradas"
                  description="Cuando se registre la primera reunión de esta Casa de Paz, su historial aparecerá aquí."
                />
              }
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center justify-between text-h4 font-semibold text-foreground">
              <span>Personas</span>
              <span className="text-caption font-normal text-foreground-muted">
                {peopleData ? formatNumber(peopleData.meta.total) : ''}
              </span>
            </h2>

            {isPeoplePending ? (
              <Loading label="Cargando personas…" lines={3} />
            ) : (peopleData?.data.length ?? 0) === 0 ? (
              <EmptyState
                icon={Users}
                title="Todavía no hay personas registradas"
                description="Cuando se registre la primera persona de esta Casa de Paz, aparecerá aquí."
              />
            ) : (
              <Grid>
                {(peopleData?.data ?? []).map((person) => (
                  <GridItem key={person.id} cols={{ mobile: 4, tablet: 4, desktop: 3 }}>
                    <PersonCard
                      firstName={person.firstName}
                      lastName={person.lastName}
                      phone={person.phone ?? undefined}
                      stage={person.personStageName ?? undefined}
                      status={toEntityStatus(person.status)}
                      attendanceRate={rateByPersonId.get(person.id) ?? null}
                      onClick={() => {
                        router.push(`/personas/${person.id}`);
                      }}
                    />
                  </GridItem>
                ))}
              </Grid>
            )}
          </section>
        </>
      ) : null}
    </Container>
  );
}
