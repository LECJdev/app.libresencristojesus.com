import { Injectable, NotFoundException } from '@nestjs/common';
import {
  RecordStatus,
  type CatDepartment,
  type CatMunicipality,
  type Prisma,
} from '@prisma/client';
import type { PaginationMeta } from '@lcj/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { ListMunicipalitiesQueryDto } from './dto/list-municipalities-query.dto';
import type { DepartmentResponseDto } from './dto/department-response.dto';
import type { MunicipalityResponseDto } from './dto/municipality-response.dto';

const DEPARTMENT_NOT_FOUND_MESSAGE = 'Department not found';

/** Columns the geography endpoints may sort by — anything else falls back to `name`. */
const SORTABLE_FIELDS: ReadonlySet<string> = new Set(['name', 'codeDane', 'status', 'createdAt']);

/**
 * Read model for the geographic catalogs.
 *
 * THIS SERVICE TALKS TO POSTGRES AND NOTHING ELSE. It has no reference to
 * `GeographySource`, and `GeographyModule` does not export that port, so
 * no functional module can reach an external API through this path — the
 * catalogs are ordinary local tables once seeded.
 *
 * Default ordering is `name` ascending rather than `createdAt` (the
 * convention in the CRUD modules): these are pick-lists a human scans, and
 * insertion order is meaningless to them.
 */
@Injectable()
export class GeographyService {
  constructor(private readonly prisma: PrismaService) {}

  async findDepartments(
    query: PaginationQueryDto,
  ): Promise<{ data: DepartmentResponseDto[]; meta: PaginationMeta }> {
    const where: Prisma.CatDepartmentWhereInput = {
      deletedAt: null,
      status: RecordStatus.ACTIVE,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [total, departments] = await this.prisma.$transaction([
      this.prisma.catDepartment.count({ where }),
      this.prisma.catDepartment.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: departments.map((department) => this.toDepartmentResponse(department)),
      meta: this.buildMeta(query, total),
    };
  }

  async findMunicipalities(
    query: ListMunicipalitiesQueryDto,
  ): Promise<{ data: MunicipalityResponseDto[]; meta: PaginationMeta }> {
    if (query.departmentId) {
      await this.assertDepartmentExists(query.departmentId);
    }

    const where: Prisma.CatMunicipalityWhereInput = {
      deletedAt: null,
      status: RecordStatus.ACTIVE,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [total, municipalities] = await this.prisma.$transaction([
      this.prisma.catMunicipality.count({ where }),
      this.prisma.catMunicipality.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: municipalities.map((municipality) => this.toMunicipalityResponse(municipality)),
      meta: this.buildMeta(query, total),
    };
  }

  private async assertDepartmentExists(departmentId: string): Promise<void> {
    const department = await this.prisma.catDepartment.findFirst({
      where: { id: departmentId, deletedAt: null },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(DEPARTMENT_NOT_FOUND_MESSAGE);
    }
  }

  private buildOrderBy(query: PaginationQueryDto): Record<string, string> {
    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'name';
    return { [sortField]: query.order };
  }

  private buildMeta(query: PaginationQueryDto, total: number): PaginationMeta {
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
    };
  }

  /**
   * `sourceName`/`externalId` are intentionally absent from every response:
   * they are synchronisation bookkeeping, and exposing them would invite a
   * client to key off an identifier that changes the day the source does.
   */
  private toDepartmentResponse(department: CatDepartment): DepartmentResponseDto {
    return {
      id: department.id,
      name: department.name,
      codeDane: department.codeDane,
      status: department.status,
    };
  }

  private toMunicipalityResponse(municipality: CatMunicipality): MunicipalityResponseDto {
    return {
      id: municipality.id,
      departmentId: municipality.departmentId,
      name: municipality.name,
      codeDane: municipality.codeDane,
      status: municipality.status,
    };
  }
}
