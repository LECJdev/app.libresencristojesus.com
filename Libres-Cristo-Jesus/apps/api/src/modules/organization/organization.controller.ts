import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { PaginationMeta } from '@lcj/types';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationTreeDto } from './dto/organization-tree.dto';
import {
  OrganizationSearchQueryDto,
  OrganizationSearchResultDto,
} from './dto/organization-search.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * `Church` ("Organización") CRUD — Fase 4. "Organización" in the business
 * language of `Documentos/06-modulo-organizacion.md` maps to the `Church`
 * table (`Documentos/04-modelo-de-datos.md` section 4) — there is no
 * `Organization` table; `Church` is the root of the `Church -> District ->
 * PeaceHouse` hierarchy, built ahead of a future multi-church deployment.
 * Every route is protected by `@RequirePermission('church', <action>)`, read
 * by the already-global `ScopeGuard` — no per-route `@UseGuards(...)`
 * needed, no `scopeType` either (the organization root is never scoped to a
 * District/Casa de Paz). See `OrganizationService`'s doc comment for the
 * create/update/delete == Administrador-only design decision and its
 * doc05/doc06 citations.
 */
@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @RequirePermission('church', 'create')
  @Audit('Church', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Create the root organization (Church) record.' })
  @ApiResponse({ status: 201, description: 'Organization created.', type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Malformed request body.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.create(dto, user);
  }

  @RequirePermission('church', 'list')
  @Get()
  @ApiOperation({ summary: 'List organizations (Church rows), paginated.' })
  @ApiResponse({ status: 200, description: 'Paginated organization list.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(
    @Query() query: ListOrganizationsQueryDto,
  ): Promise<{ data: OrganizationResponseDto[]; meta: PaginationMeta }> {
    return this.organizationService.findAll(query);
  }

  /**
   * ROUTE ORDER MATTERS FOR EVERY LITERAL PATH BELOW.
   *
   * `search`, `tree` and `tree/:churchId` are all declared BEFORE
   * `GET /:id`, because Nest matches routes in declaration order: with the
   * parameterised route first, `/organizations/search` would be swallowed
   * as `id="search"` and answered with a 404 that looks like a data
   * problem rather than a routing one.
   *
   * All three are guarded by `church:read`, granted to the four roles:
   * doc06 §4 says every authenticated user may consult the organigrama.
   * What the role changes is how MUCH comes back, and that narrowing lives
   * in the service.
   */
  @RequirePermission('church', 'read')
  @Get('search')
  @ApiOperation({
    summary: 'Global search across districts, Casas de Paz, leadership and geography (doc06 §12).',
    description:
      'Results are never narrowed by role (doc06 §4: consulting the organigrama does not depend on role).',
  })
  @ApiResponse({ status: 200, description: 'Grouped results.', type: OrganizationSearchResultDto })
  @ApiResponse({ status: 400, description: 'Query shorter than 2 characters.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async search(
    @Query() query: OrganizationSearchQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationSearchResultDto> {
    return this.organizationService.search(query, user);
  }

  @RequirePermission('church', 'read')
  @Get('tree')
  @ApiOperation({
    summary: 'Organizational tree of the single Church (doc06: "Debe existir una única Iglesia").',
  })
  @ApiResponse({ status: 200, description: 'Organizational tree.', type: OrganizationTreeDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'No active Church exists yet.' })
  async findDefaultTree(@CurrentUser() user: JwtPayload): Promise<OrganizationTreeDto> {
    return this.organizationService.findTree(undefined, user);
  }

  @RequirePermission('church', 'read')
  @Get('tree/:churchId')
  @ApiParam({ name: 'churchId' })
  @ApiOperation({
    summary:
      'Full organizational tree: Church → Pastores Generales → Districts → Casas de Paz → Liderazgo.',
    description:
      'Never narrowed by role (doc06 §4: "No dependerá del rol") — every authenticated user receives the whole tree. The `scoped` flag is kept for API-shape stability and is always false.',
  })
  @ApiResponse({ status: 200, description: 'Organizational tree.', type: OrganizationTreeDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Church not found.' })
  async findTree(
    @Param('churchId') churchId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationTreeDto> {
    return this.organizationService.findTree(churchId, user);
  }

  @RequirePermission('church', 'read')
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Get a single organization (Church) by id.' })
  @ApiResponse({ status: 200, description: 'Organization found.', type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  async findOne(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.organizationService.findOne(id);
  }

  @RequirePermission('church', 'update')
  @Audit('Church', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Update an organization (Church).' })
  @ApiResponse({ status: 200, description: 'Organization updated.', type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Malformed request body.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  @ApiResponse({ status: 409, description: 'Version mismatch (optimistic locking conflict).' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.update(id, dto, user);
  }

  @RequirePermission('church', 'delete')
  @Audit('Church', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary:
      'Soft-delete an organization (Church) — rejected with 409 if it still has active Districts.',
  })
  @ApiResponse({ status: 200, description: 'Organization deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  @ApiResponse({ status: 409, description: 'Organization still has active Districts.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.organizationService.remove(id, user);
    return { data: null, message: 'Organización eliminada correctamente.' };
  }
}
