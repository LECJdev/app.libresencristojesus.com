import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus, type SermonTheme } from '@prisma/client';
import type { PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type {
  CreateSermonThemeDto,
  ListSermonThemesQueryDto,
  SermonThemeResponseDto,
  UpdateSermonThemeDto,
} from './dto/sermon-theme.dto';

const THEME_NOT_FOUND = 'El tema no existe o fue eliminado';
const DUPLICATE_TITLE = 'Ya existe un tema con este título';
const VERSION_CONFLICT = 'El tema fue modificado por alguien más — recargue e intente nuevamente';

/** Columns `GET /sermon-themes` may sort by — anything else falls back to `title`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set(['title', 'series', 'createdAt', 'updatedAt']);

/**
 * Catálogo de temas de predicación (doc04 §6 `SermonTheme`).
 *
 * WHY A CATALOG AT ALL
 * doc04 states it outright: "No escribir el tema manualmente cada semana."
 * The same series runs across every Casa de Paz in the same week, so free
 * text would be typed dozens of times and would make reporting by theme
 * impossible — "Fe", "La Fe" and "LA FE" are three themes to a database
 * and one to a person.
 *
 * Style/error-handling precedent: `PeopleService` — same standard NestJS
 * exceptions, same soft-delete and optimistic-locking conventions.
 */
@Injectable()
export class SermonThemesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSermonThemeDto, actor: JwtPayload): Promise<SermonThemeResponseDto> {
    const title = dto.title.trim();
    await this.assertTitleIsFree(title);

    try {
      const theme = await this.prisma.sermonTheme.create({
        data: {
          title,
          description: dto.description?.trim() || null,
          series: dto.series?.trim() || null,
          createdBy: actor.sub,
        },
      });
      return SermonThemesService.toResponse(theme);
    } catch (error) {
      // The pre-check above lost a race with another request. The unique
      // index is what actually holds the rule; this only turns it into a
      // clean 409 instead of a raw constraint error.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(DUPLICATE_TITLE);
      }
      throw error;
    }
  }

  async findAll(
    query: ListSermonThemesQueryDto,
  ): Promise<{ data: SermonThemeResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.SermonThemeWhereInput = {
      deletedAt: null,
      ...(query.series ? { series: query.series } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { series: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'title';
    const orderBy = { [sortField]: query.order } as Prisma.SermonThemeOrderByWithRelationInput;

    const [total, themes] = await this.prisma.$transaction([
      this.prisma.sermonTheme.count({ where }),
      this.prisma.sermonTheme.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: themes.map((theme) => SermonThemesService.toResponse(theme)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  /**
   * The distinct series in use, for the "agrupar por serie" selector.
   *
   * Derived from the themes themselves rather than kept in its own table:
   * a series with no themes is not a series, it is a typo waiting to be
   * cleaned up.
   */
  async findSeries(): Promise<string[]> {
    const rows = await this.prisma.sermonTheme.findMany({
      where: { deletedAt: null, series: { not: null } },
      distinct: ['series'],
      orderBy: { series: 'asc' },
      select: { series: true },
    });

    return rows.map((row) => row.series).filter((series): series is string => series !== null);
  }

  async findOne(id: string): Promise<SermonThemeResponseDto> {
    return SermonThemesService.toResponse(await this.findOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateSermonThemeDto,
    actor: JwtPayload,
  ): Promise<SermonThemeResponseDto> {
    const current = await this.findOrThrow(id);

    if (dto.title !== undefined && dto.title.trim() !== current.title) {
      await this.assertTitleIsFree(dto.title.trim(), id);
    }

    try {
      const theme = await this.prisma.sermonTheme.update({
        // `version` in the WHERE is the optimistic lock: a stale write
        // matches no row and Prisma answers P2025.
        where: { id, version: dto.version },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.series !== undefined ? { series: dto.series.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          updatedBy: actor.sub,
          version: { increment: 1 },
        },
      });
      return SermonThemesService.toResponse(theme);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ConflictException(VERSION_CONFLICT);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(DUPLICATE_TITLE);
        }
      }
      throw error;
    }
  }

  /**
   * Soft delete (doc04 §13). The meetings that used the theme keep pointing
   * at it: erasing a theme would rewrite history, and "what did we preach
   * in March?" must stay answerable.
   */
  async remove(id: string, actor: JwtPayload): Promise<void> {
    await this.findOrThrow(id);

    await this.prisma.sermonTheme.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actor.sub,
        status: RecordStatus.INACTIVE,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Case-insensitive, because "Fe" and "fe" are the same theme to everyone
   * except a `UNIQUE` index on raw text.
   */
  private async assertTitleIsFree(title: string, exceptId?: string): Promise<void> {
    const existing = await this.prisma.sermonTheme.findFirst({
      where: {
        title: { equals: title, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(DUPLICATE_TITLE);
    }
  }

  private async findOrThrow(id: string): Promise<SermonTheme> {
    const theme = await this.prisma.sermonTheme.findFirst({ where: { id, deletedAt: null } });

    if (!theme) {
      throw new NotFoundException(THEME_NOT_FOUND);
    }

    return theme;
  }

  static toResponse(theme: SermonTheme): SermonThemeResponseDto {
    return {
      id: theme.id,
      title: theme.title,
      description: theme.description,
      series: theme.series,
      status: theme.status,
      version: theme.version,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    };
  }
}
