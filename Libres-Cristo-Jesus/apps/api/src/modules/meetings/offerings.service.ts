import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { peaceHouseScopeFilter } from '../../common/security/peace-house-scope';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type {
  ListOfferingsQueryDto,
  OfferingHistoryRowDto,
  OfferingPeriodDto,
  OfferingSummaryDto,
} from './dto/list-offerings-query.dto';

/** Columns of `Offering` itself that `GET /offerings` may sort by. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set(['amount', 'createdAt']);

/**
 * Historial y estadísticas de ofrendas — la mitad de lectura de la Fase 8.
 *
 * SEPARATE FROM `MeetingsService` ON PURPOSE
 * That service owns the writes, which all share one concern: the weekly
 * lock. This one owns cross-cutting reads, which share a different one: row
 * scope over a collection. Merging them would produce a class where half
 * the methods care about a calendar and the other half about a hierarchy.
 */
@Injectable()
export class OfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListOfferingsQueryDto,
    actor: JwtPayload,
  ): Promise<{ data: OfferingHistoryRowDto[]; meta: PaginationMeta }> {
    const where = this.buildWhere(query, actor);

    const orderBy = OfferingsService.buildOrderBy(query);

    const [total, offerings] = await this.prisma.$transaction([
      this.prisma.offering.count({ where }),
      this.prisma.offering.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          meeting: {
            select: {
              id: true,
              meetingDate: true,
              isoYear: true,
              isoWeek: true,
              meetingSchedule: {
                select: { peaceHouseId: true, peaceHouse: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: offerings.map((offering) => ({
        id: offering.id,
        meetingId: offering.meetingId,
        peaceHouseId: offering.meeting.meetingSchedule.peaceHouseId,
        peaceHouseName: offering.meeting.meetingSchedule.peaceHouse.name,
        meetingDate: offering.meeting.meetingDate,
        isoYear: offering.meeting.isoYear,
        isoWeek: offering.meeting.isoWeek,
        amount: offering.amount.toNumber(),
        notes: offering.notes,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  /**
   * Totales, promedio y desglose por semana ISO.
   *
   * Aggregated in the database rather than by summing the paginated page:
   * a summary that only covers the twenty rows currently on screen is a
   * lie that looks like a statistic.
   */
  async summary(query: ListOfferingsQueryDto, actor: JwtPayload): Promise<OfferingSummaryDto> {
    const where = this.buildWhere(query, actor);

    const [aggregate, rows] = await Promise.all([
      this.prisma.offering.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
        _min: { amount: true },
        _max: { amount: true },
        _count: true,
      }),
      this.prisma.offering.findMany({
        where,
        select: { amount: true, meeting: { select: { isoYear: true, isoWeek: true } } },
      }),
    ]);

    const buckets = new Map<string, OfferingPeriodDto>();
    for (const row of rows) {
      const { isoYear, isoWeek } = row.meeting;
      const key = `${isoYear}-${isoWeek}`;
      const bucket = buckets.get(key) ?? { isoYear, isoWeek, total: 0, count: 0 };
      bucket.total += row.amount.toNumber();
      bucket.count += 1;
      buckets.set(key, bucket);
    }

    const byWeek = Array.from(buckets.values()).sort(
      (a, b) => a.isoYear - b.isoYear || a.isoWeek - b.isoWeek,
    );

    return {
      total: aggregate._sum.amount?.toNumber() ?? 0,
      count: aggregate._count,
      average: aggregate._avg.amount?.toNumber() ?? 0,
      min: aggregate._min.amount?.toNumber() ?? null,
      max: aggregate._max.amount?.toNumber() ?? null,
      byWeek,
    };
  }

  /**
   * Default order is the newest meeting first — a history is read from
   * today backwards. `meetingDate` is offered explicitly too, because it
   * lives on the relation and would otherwise be the one column a caller
   * cannot sort by.
   */
  private static buildOrderBy(
    query: ListOfferingsQueryDto,
  ): Prisma.OfferingOrderByWithRelationInput {
    if (query.sort === 'meetingDate') {
      return { meeting: { meetingDate: query.order } };
    }

    if (query.sort && SORTABLE_FIELDS.has(query.sort)) {
      return { [query.sort]: query.order };
    }

    return { meeting: { meetingDate: 'desc' } };
  }

  private buildWhere(query: ListOfferingsQueryDto, actor: JwtPayload): Prisma.OfferingWhereInput {
    const meetingFilter: Prisma.MeetingWhereInput = {
      deletedAt: null,
      ...(query.from || query.to
        ? {
            meetingDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      meetingSchedule: {
        ...(query.peaceHouseId ? { peaceHouseId: query.peaceHouseId } : {}),
        peaceHouse: {
          ...(query.districtId ? { districtId: query.districtId } : {}),
          ...peaceHouseScopeFilter(actor),
        },
      },
    };

    return { deletedAt: null, meeting: meetingFilter };
  }
}
