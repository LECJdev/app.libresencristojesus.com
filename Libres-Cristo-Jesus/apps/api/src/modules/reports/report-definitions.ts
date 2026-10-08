import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { peaceHouseScopeFilter } from '../../common/security/peace-house-scope';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import { ReportType, type ReportCellFormat, type ReportQueryDto } from './dto/report.dto';

/**
 * THE SINGLE DEFINITION OF EACH REPORT.
 *
 * A report is a title, a list of columns and a query — declared once, here.
 * The on-screen preview and the Excel export are two RENDERERS over this
 * same object; neither knows anything about the other.
 *
 * WHY THAT MATTERS MORE THAN IT LOOKS
 * The obvious alternative is a `findAll` for the table and a separate
 * `exportToExcel` that builds its own header row. They start identical and
 * drift the first time someone adds a column: the screen shows it, the
 * download does not, and the person reconciling the two spreadsheets has no
 * idea which one is wrong. Here a new column is one line and both surfaces
 * get it.
 */

export type ReportCellValue = string | number | null;

export interface ReportColumn<TRow> {
  key: string;
  /** Visible header — Spanish, and identical in the table and the sheet. */
  header: string;
  /** Column width in the exported sheet, in characters. */
  width: number;
  format: ReportCellFormat;
  value: (row: TRow) => ReportCellValue;
}

export interface ReportDefinition<TRow> {
  type: ReportType;
  title: string;
  columns: ReportColumn<TRow>[];
  /**
   * Whether the date filters apply. `people` and `peace-houses` describe a
   * present state, so a range would silently narrow them by their creation
   * date — which is not what anyone filtering "del 1 al 30" means.
   */
  supportsDateRange: boolean;
  fetch: (context: ReportContext) => Promise<TRow[]>;
}

export interface ReportContext {
  prisma: PrismaService;
  query: ReportQueryDto;
  actor: JwtPayload;
  /** Rows to read. Absent means "everything the filter matches" (the export). */
  take?: number;
  skip?: number;
}

/**
 * The scope + filters every report starts from.
 *
 * A specific `peaceHouseId` is never scoped — same explicit product
 * exception as `PeaceHousesController`/`PeopleController`'s read routes:
 * asking about ONE named Casa de Paz is "viewing that house", open to
 * every role. Without a `peaceHouseId` (an aggregate report spanning
 * every house the caller would otherwise see — the Dashboard's shape)
 * `peaceHouseScopeFilter` still applies, so this never becomes a way for
 * a Líder to pull every Casa de Paz's numbers at once.
 */
function peaceHouseWhere(context: ReportContext): Prisma.PeaceHouseWhereInput {
  return {
    deletedAt: null,
    ...(context.query.districtId ? { districtId: context.query.districtId } : {}),
    ...(context.query.peaceHouseId
      ? { id: context.query.peaceHouseId }
      : peaceHouseScopeFilter(context.actor)),
  };
}

function meetingWhere(context: ReportContext): Prisma.MeetingWhereInput {
  const { from, to } = context.query;
  return {
    deletedAt: null,
    ...(from || to
      ? {
          meetingDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
    meetingSchedule: { peaceHouse: peaceHouseWhere(context) },
  };
}

/* ------------------------------------------------------------------ *
 * Row shapes — what each query actually returns.
 * ------------------------------------------------------------------ */

interface AttendanceRow {
  meetingDate: Date;
  isoYear: number;
  isoWeek: number;
  peaceHouseName: string;
  districtName: string;
  present: number;
  roster: number;
}

interface OfferingRow {
  meetingDate: Date;
  isoYear: number;
  isoWeek: number;
  peaceHouseName: string;
  districtName: string;
  amount: number;
  notes: string | null;
}

interface PersonRow {
  firstName: string;
  lastName: string;
  document: string | null;
  phone: string | null;
  stage: string | null;
  peaceHouseName: string | null;
  status: string;
}

interface PeaceHouseRow {
  name: string;
  code: string | null;
  districtName: string;
  municipality: string | null;
  department: string | null;
  meetingDay: string | null;
  meetingHour: string | null;
  members: number;
  status: string;
}

/* ------------------------------------------------------------------ *
 * Definitions
 * ------------------------------------------------------------------ */

const attendanceReport: ReportDefinition<AttendanceRow> = {
  type: ReportType.ATTENDANCE,
  title: 'Asistencia por reunión',
  supportsDateRange: true,
  columns: [
    {
      key: 'meetingDate',
      header: 'Fecha',
      width: 14,
      format: 'date',
      value: (r) => iso(r.meetingDate),
    },
    {
      key: 'week',
      header: 'Semana ISO',
      width: 12,
      format: 'text',
      value: (r) => `${r.isoWeek}/${r.isoYear}`,
    },
    {
      key: 'district',
      header: 'Distrito',
      width: 24,
      format: 'text',
      value: (r) => r.districtName,
    },
    {
      key: 'peaceHouse',
      header: 'Casa de Paz',
      width: 28,
      format: 'text',
      value: (r) => r.peaceHouseName,
    },
    { key: 'present', header: 'Presentes', width: 12, format: 'number', value: (r) => r.present },
    { key: 'roster', header: 'En lista', width: 12, format: 'number', value: (r) => r.roster },
    {
      key: 'rate',
      header: '% Asistencia',
      width: 14,
      format: 'number',
      // Guarded: a meeting whose roster is empty would divide by zero and
      // put NaN in a cell nobody can interpret.
      value: (r) => (r.roster === 0 ? 0 : Math.round((r.present / r.roster) * 1000) / 10),
    },
  ],
  fetch: async ({ prisma, query, actor, take, skip }) => {
    const meetings = await prisma.meeting.findMany({
      where: meetingWhere({ prisma, query, actor }),
      orderBy: { meetingDate: 'desc' },
      ...(take !== undefined ? { take } : {}),
      ...(skip !== undefined ? { skip } : {}),
      select: {
        meetingDate: true,
        isoYear: true,
        isoWeek: true,
        meetingSchedule: {
          select: {
            peaceHouse: {
              select: {
                name: true,
                district: { select: { name: true } },
                _count: {
                  select: { personHistory: { where: { endDate: null, deletedAt: null } } },
                },
              },
            },
          },
        },
        _count: { select: { attendances: { where: { present: true, deletedAt: null } } } },
      },
    });

    return meetings.map((meeting) => ({
      meetingDate: meeting.meetingDate,
      isoYear: meeting.isoYear,
      isoWeek: meeting.isoWeek,
      peaceHouseName: meeting.meetingSchedule.peaceHouse.name,
      districtName: meeting.meetingSchedule.peaceHouse.district.name,
      present: meeting._count.attendances,
      roster: meeting.meetingSchedule.peaceHouse._count.personHistory,
    }));
  },
};

const offeringsReport: ReportDefinition<OfferingRow> = {
  type: ReportType.OFFERINGS,
  title: 'Ofrendas por reunión',
  supportsDateRange: true,
  columns: [
    {
      key: 'meetingDate',
      header: 'Fecha',
      width: 14,
      format: 'date',
      value: (r) => iso(r.meetingDate),
    },
    {
      key: 'week',
      header: 'Semana ISO',
      width: 12,
      format: 'text',
      value: (r) => `${r.isoWeek}/${r.isoYear}`,
    },
    {
      key: 'district',
      header: 'Distrito',
      width: 24,
      format: 'text',
      value: (r) => r.districtName,
    },
    {
      key: 'peaceHouse',
      header: 'Casa de Paz',
      width: 28,
      format: 'text',
      value: (r) => r.peaceHouseName,
    },
    { key: 'amount', header: 'Valor (COP)', width: 16, format: 'currency', value: (r) => r.amount },
    { key: 'notes', header: 'Observaciones', width: 36, format: 'text', value: (r) => r.notes },
  ],
  fetch: async ({ prisma, query, actor, take, skip }) => {
    const offerings = await prisma.offering.findMany({
      where: { deletedAt: null, meeting: meetingWhere({ prisma, query, actor }) },
      orderBy: { meeting: { meetingDate: 'desc' } },
      ...(take !== undefined ? { take } : {}),
      ...(skip !== undefined ? { skip } : {}),
      select: {
        amount: true,
        notes: true,
        meeting: {
          select: {
            meetingDate: true,
            isoYear: true,
            isoWeek: true,
            meetingSchedule: {
              select: {
                peaceHouse: { select: { name: true, district: { select: { name: true } } } },
              },
            },
          },
        },
      },
    });

    return offerings.map((offering) => ({
      meetingDate: offering.meeting.meetingDate,
      isoYear: offering.meeting.isoYear,
      isoWeek: offering.meeting.isoWeek,
      peaceHouseName: offering.meeting.meetingSchedule.peaceHouse.name,
      districtName: offering.meeting.meetingSchedule.peaceHouse.district.name,
      amount: offering.amount.toNumber(),
      notes: offering.notes,
    }));
  },
};

const peopleReport: ReportDefinition<PersonRow> = {
  type: ReportType.PEOPLE,
  title: 'Personas',
  supportsDateRange: false,
  columns: [
    { key: 'lastName', header: 'Apellidos', width: 24, format: 'text', value: (r) => r.lastName },
    { key: 'firstName', header: 'Nombres', width: 24, format: 'text', value: (r) => r.firstName },
    { key: 'document', header: 'Documento', width: 18, format: 'text', value: (r) => r.document },
    { key: 'phone', header: 'Celular', width: 16, format: 'text', value: (r) => r.phone },
    { key: 'stage', header: 'Etapa', width: 20, format: 'text', value: (r) => r.stage },
    {
      key: 'peaceHouse',
      header: 'Casa de Paz',
      width: 28,
      format: 'text',
      value: (r) => r.peaceHouseName,
    },
    { key: 'status', header: 'Estado', width: 12, format: 'text', value: (r) => r.status },
  ],
  fetch: async ({ prisma, query, actor, take, skip }) => {
    const people = await prisma.person.findMany({
      where: {
        deletedAt: null,
        // A person belongs to a house through the OPEN membership period —
        // someone who left last year must not appear under their old house.
        peaceHouseHistory: {
          some: {
            endDate: null,
            deletedAt: null,
            peaceHouse: peaceHouseWhere({ prisma, query, actor }),
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      ...(take !== undefined ? { take } : {}),
      ...(skip !== undefined ? { skip } : {}),
      select: {
        firstName: true,
        lastName: true,
        document: true,
        phone: true,
        status: true,
        personStage: { select: { name: true } },
        peaceHouseHistory: {
          where: { endDate: null, deletedAt: null },
          take: 1,
          select: { peaceHouse: { select: { name: true } } },
        },
      },
    });

    return people.map((person) => ({
      firstName: person.firstName,
      lastName: person.lastName,
      document: person.document,
      phone: person.phone,
      stage: person.personStage?.name ?? null,
      peaceHouseName: person.peaceHouseHistory[0]?.peaceHouse.name ?? null,
      status: person.status,
    }));
  },
};

const peaceHousesReport: ReportDefinition<PeaceHouseRow> = {
  type: ReportType.PEACE_HOUSES,
  title: 'Casas de Paz',
  supportsDateRange: false,
  columns: [
    { key: 'code', header: 'Código', width: 14, format: 'text', value: (r) => r.code },
    { key: 'name', header: 'Casa de Paz', width: 28, format: 'text', value: (r) => r.name },
    {
      key: 'district',
      header: 'Distrito',
      width: 24,
      format: 'text',
      value: (r) => r.districtName,
    },
    {
      key: 'department',
      header: 'Departamento',
      width: 20,
      format: 'text',
      value: (r) => r.department,
    },
    {
      key: 'municipality',
      header: 'Municipio',
      width: 20,
      format: 'text',
      value: (r) => r.municipality,
    },
    { key: 'meetingDay', header: 'Día', width: 12, format: 'text', value: (r) => r.meetingDay },
    { key: 'meetingHour', header: 'Hora', width: 10, format: 'text', value: (r) => r.meetingHour },
    { key: 'members', header: 'Personas', width: 12, format: 'number', value: (r) => r.members },
    { key: 'status', header: 'Estado', width: 12, format: 'text', value: (r) => r.status },
  ],
  fetch: async ({ prisma, query, actor, take, skip }) => {
    const houses = await prisma.peaceHouse.findMany({
      where: peaceHouseWhere({ prisma, query, actor }),
      orderBy: { name: 'asc' },
      ...(take !== undefined ? { take } : {}),
      ...(skip !== undefined ? { skip } : {}),
      select: {
        name: true,
        code: true,
        meetingDay: true,
        meetingHour: true,
        status: true,
        district: { select: { name: true } },
        municipality: { select: { name: true } },
        department: { select: { name: true } },
        _count: { select: { personHistory: { where: { endDate: null, deletedAt: null } } } },
      },
    });

    return houses.map((house) => ({
      name: house.name,
      code: house.code,
      districtName: house.district.name,
      municipality: house.municipality?.name ?? null,
      department: house.department?.name ?? null,
      meetingDay: house.meetingDay,
      meetingHour: house.meetingHour,
      members: house._count.personHistory,
      status: house.status,
    }));
  },
};

/**
 * Typed as `ReportDefinition<never>`-compatible through a narrow accessor:
 * each definition is generic over its own row shape, and callers only ever
 * need "render this", never the shape itself.
 */
const DEFINITIONS = {
  [ReportType.ATTENDANCE]: attendanceReport,
  [ReportType.OFFERINGS]: offeringsReport,
  [ReportType.PEOPLE]: peopleReport,
  [ReportType.PEACE_HOUSES]: peaceHousesReport,
} as const;

/**
 * Runs a definition and returns its rows already flattened to primitives.
 *
 * Flattening HERE rather than in each renderer is what lets the preview and
 * the sheet share one code path: by the time either sees the data it is just
 * keys and values, in column order.
 */
export async function runReport(
  type: ReportType,
  context: ReportContext,
): Promise<{
  title: string;
  columns: { key: string; header: string; width: number; format: ReportCellFormat }[];
  rows: Record<string, ReportCellValue>[];
}> {
  const definition = DEFINITIONS[type];

  // A date range on a report that describes a present state would narrow it
  // by creation date, which is never what "del 1 al 30" means. Dropped
  // rather than rejected: the filter bar is shared by every report.
  const query = definition.supportsDateRange
    ? context.query
    : { ...context.query, from: undefined, to: undefined };

  const rows = await definition.fetch({ ...context, query });

  return {
    title: definition.title,
    columns: definition.columns.map(({ key, header, width, format }) => ({
      key,
      header,
      width,
      format,
    })),
    rows: rows.map((row) => {
      const flat: Record<string, ReportCellValue> = {};
      for (const column of definition.columns) {
        // `row` is the definition's own row type; the map above proves the
        // pairing, and the cast is confined to this single line.
        flat[column.key] = column.value(row as never);
      }
      return flat;
    }),
  };
}

/** Total rows the filter matches, for the preview's pager. */
export function countReport(type: ReportType, context: ReportContext): Promise<number> {
  const { prisma, query, actor } = context;

  switch (type) {
    case ReportType.ATTENDANCE:
      return prisma.meeting.count({ where: meetingWhere(context) });
    case ReportType.OFFERINGS:
      return prisma.offering.count({
        where: { deletedAt: null, meeting: meetingWhere(context) },
      });
    case ReportType.PEOPLE:
      return prisma.person.count({
        where: {
          deletedAt: null,
          peaceHouseHistory: {
            some: { endDate: null, deletedAt: null, peaceHouse: peaceHouseWhere(context) },
          },
        },
      });
    default:
      return prisma.peaceHouse.count({ where: peaceHouseWhere({ prisma, query, actor }) });
  }
}

/** `YYYY-MM-DD` — the date without the instant, which is all a report shows. */
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
