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
import { DistrictsService } from './districts.service';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { ListDistrictsQueryDto } from './dto/list-districts-query.dto';
import { DistrictResponseDto } from './dto/district-response.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { ScopeResourceType } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * `District` ("Distrito") CRUD — Fase 4 (doc04 §4, doc06). Every route is
 * protected by `@RequirePermission('district', <action>)`, read by the
 * already-global `ScopeGuard` — no per-route `@UseGuards(...)` needed.
 * `GET/PATCH/DELETE /districts/:id` additionally pass `scopeType:
 * ScopeResourceType.DISTRICT` so a Pastor de Distrito can only reach their own
 * District (doc05 Policy 2) — see `DistrictsService`'s doc comment for the
 * exact per-role permission grants and their doc05/doc06 citations, including
 * the known `ScopeGuard` limitation for the Líder role on these three routes.
 */
@ApiTags('districts')
@ApiBearerAuth()
@Controller('districts')
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @RequirePermission('district', 'create')
  @Audit('District', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Create a District.' })
  @ApiResponse({ status: 201, description: 'District created.', type: DistrictResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Malformed request body, inactive Church, or leadershipUnitId with the wrong role.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'churchId or leadershipUnitId not found.' })
  @ApiResponse({
    status: 409,
    description: 'A District with this number already exists for this Church.',
  })
  async create(
    @Body() dto: CreateDistrictDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DistrictResponseDto> {
    return this.districtsService.create(dto, user);
  }

  @RequirePermission('district', 'list')
  @Get()
  @ApiOperation({ summary: 'List districts, paginated, optionally filtered by churchId.' })
  @ApiResponse({ status: 200, description: 'Paginated district list.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(
    @Query() query: ListDistrictsQueryDto,
  ): Promise<{ data: DistrictResponseDto[]; meta: PaginationMeta }> {
    return this.districtsService.findAll(query);
  }

  @RequirePermission('district', 'read', { scopeType: ScopeResourceType.DISTRICT })
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Get a single District by id.' })
  @ApiResponse({ status: 200, description: 'District found.', type: DistrictResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or District is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'District not found.' })
  async findOne(@Param('id') id: string): Promise<DistrictResponseDto> {
    return this.districtsService.findOne(id);
  }

  @RequirePermission('district', 'update', { scopeType: ScopeResourceType.DISTRICT })
  @Audit('District', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Update a District.' })
  @ApiResponse({ status: 200, description: 'District updated.', type: DistrictResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Malformed request body, inactive Church, or leadershipUnitId with the wrong role.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or District is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'District, churchId or leadershipUnitId not found.' })
  @ApiResponse({ status: 409, description: 'Version mismatch, or duplicate (churchId, number).' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDistrictDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DistrictResponseDto> {
    return this.districtsService.update(id, dto, user);
  }

  @RequirePermission('district', 'delete', { scopeType: ScopeResourceType.DISTRICT })
  @Audit('District', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Soft-delete a District — rejected with 409 if it still has active Casas de Paz.',
  })
  @ApiResponse({ status: 200, description: 'District deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or District is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'District not found.' })
  @ApiResponse({ status: 409, description: 'District still has active Casas de Paz.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.districtsService.remove(id, user);
    return { data: null, message: 'Distrito eliminado correctamente.' };
  }
}
