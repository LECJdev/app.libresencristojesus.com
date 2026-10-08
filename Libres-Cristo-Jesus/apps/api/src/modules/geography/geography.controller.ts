import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { PaginationMeta } from '@lcj/types';
import { GeographyService } from './geography.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ListMunicipalitiesQueryDto } from './dto/list-municipalities-query.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { MunicipalityResponseDto } from './dto/municipality-response.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';

/**
 * Read-only access to the geographic catalogs (doc04 §3).
 *
 * There is no POST/PATCH/DELETE here on purpose: doc04 §3 calls these
 * tables "administradas por el sistema y casi nunca cambiarán". They are
 * written once by `ColombiaSeeder` at installation and by nothing else —
 * hand-editing a municipality would silently diverge the catalog from the
 * official source it was derived from.
 *
 * `geography:list` is granted to all four roles: every role that can open
 * a Casa de Paz form needs the department/municipality pick-lists, and the
 * contents are public knowledge about Colombia, not church data.
 */
@ApiTags('geography')
@ApiBearerAuth()
@Controller('geography')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @RequirePermission('geography', 'list')
  @Get('departments')
  @ApiOperation({ summary: 'List departments, paginated and searchable by name.' })
  @ApiResponse({
    status: 200,
    description: 'Paginated department list.',
    type: [DepartmentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findDepartments(
    @Query() query: PaginationQueryDto,
  ): Promise<{ data: DepartmentResponseDto[]; meta: PaginationMeta }> {
    return this.geographyService.findDepartments(query);
  }

  @RequirePermission('geography', 'list')
  @Get('municipalities')
  @ApiOperation({
    summary: 'List municipalities, paginated, searchable, and filterable by departmentId.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated municipality list.',
    type: [MunicipalityResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'departmentId not found.' })
  async findMunicipalities(
    @Query() query: ListMunicipalitiesQueryDto,
  ): Promise<{ data: MunicipalityResponseDto[]; meta: PaginationMeta }> {
    return this.geographyService.findMunicipalities(query);
  }
}
