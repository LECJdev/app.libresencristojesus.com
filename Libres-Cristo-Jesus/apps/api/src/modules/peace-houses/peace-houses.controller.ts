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
import { PeaceHousesService } from './peace-houses.service';
import { CreatePeaceHouseDto } from './dto/create-peace-house.dto';
import { UpdatePeaceHouseDto } from './dto/update-peace-house.dto';
import { ListPeaceHousesQueryDto } from './dto/list-peace-houses-query.dto';
import { PeaceHouseResponseDto } from './dto/peace-house-response.dto';
import { LeadershipHistoryResponseDto } from './dto/leadership-history-response.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { ScopeResourceType } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * `PeaceHouse` ("Casa de Paz") CRUD — Fase 4 (doc04 §4, doc07), the last business module of
 * this phase. Every route is protected by `@RequirePermission('peace-house', <action>)`, read
 * by the already-global `ScopeGuard` — no per-route `@UseGuards(...)` needed.
 *
 * READ vs ADMINISTER: `GET /peace-houses/:id` and `GET /peace-houses/:id/leadership-history`
 * carry no `scopeType` — same principle as the Organigrama (doc06 §4: consulting does not
 * depend on role). `PATCH/DELETE /peace-houses/:id` keep `scopeType:
 * ScopeResourceType.PEACE_HOUSE`, so a Líder can only administer their own Casa de Paz (doc05
 * Policy 1) and a Pastor de Distrito only the Casas de Paz within their District (doc05
 * Policy 2) — see `PeaceHousesService`'s doc comment for the exact per-role permission
 * grants and their doc02/doc05/doc07 citations.
 */
@ApiTags('peace-houses')
@ApiBearerAuth()
@Controller('peace-houses')
export class PeaceHousesController {
  constructor(private readonly peaceHousesService: PeaceHousesService) {}

  @RequirePermission('peace-house', 'create')
  @Audit('PeaceHouse', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Create a Casa de Paz.' })
  @ApiResponse({ status: 201, description: 'Casa de Paz created.', type: PeaceHouseResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Malformed request body, inactive District, or leadershipUnitId with the wrong role.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'districtId or leadershipUnitId not found.' })
  @ApiResponse({
    status: 409,
    description:
      'A Casa de Paz with this name already exists in this District, or leadershipUnitId already leads another active Casa de Paz.',
  })
  async create(
    @Body() dto: CreatePeaceHouseDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PeaceHouseResponseDto> {
    return this.peaceHousesService.create(dto, user);
  }

  @RequirePermission('peace-house', 'list')
  @Get()
  @ApiOperation({ summary: 'List Casas de Paz, paginated, optionally filtered by districtId.' })
  @ApiResponse({ status: 200, description: 'Paginated Casa de Paz list.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(
    @Query() query: ListPeaceHousesQueryDto,
  ): Promise<{ data: PeaceHouseResponseDto[]; meta: PaginationMeta }> {
    return this.peaceHousesService.findAll(query);
  }

  @RequirePermission('peace-house', 'read')
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Get a single Casa de Paz by id.',
    description:
      'Never scoped by role (doc06 §4) — any authenticated user may view any Casa de Paz.',
  })
  @ApiResponse({ status: 200, description: 'Casa de Paz found.', type: PeaceHouseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Casa de Paz not found.' })
  async findOne(@Param('id') id: string): Promise<PeaceHouseResponseDto> {
    return this.peaceHousesService.findOne(id);
  }

  @RequirePermission('peace-house', 'read')
  @Get(':id/leadership-history')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Leadership history of a Casa de Paz, newest period first (doc06 §10/§14).',
    description:
      'Every period the Casa de Paz has had, including the current one (the entry whose endDate is null). History is never deleted. Never scoped by role (doc06 §4).',
  })
  @ApiResponse({
    status: 200,
    description: 'Leadership history.',
    type: [LeadershipHistoryResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Casa de Paz not found.' })
  async findLeadershipHistory(@Param('id') id: string): Promise<LeadershipHistoryResponseDto[]> {
    return this.peaceHousesService.findLeadershipHistory(id);
  }

  @RequirePermission('peace-house', 'update', { scopeType: ScopeResourceType.PEACE_HOUSE })
  @Audit('PeaceHouse', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Update a Casa de Paz.' })
  @ApiResponse({ status: 200, description: 'Casa de Paz updated.', type: PeaceHouseResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Malformed request body, inactive District, or leadershipUnitId with the wrong role.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or Casa de Paz is outside of your scope.',
  })
  @ApiResponse({
    status: 404,
    description: 'Casa de Paz, districtId or leadershipUnitId not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Version mismatch, duplicate (districtId, name), or leadershipUnitId already leads another active Casa de Paz.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePeaceHouseDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PeaceHouseResponseDto> {
    return this.peaceHousesService.update(id, dto, user);
  }

  @RequirePermission('peace-house', 'delete', { scopeType: ScopeResourceType.PEACE_HOUSE })
  @Audit('PeaceHouse', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Soft-delete (cerrar) a Casa de Paz — never a physical delete.' })
  @ApiResponse({ status: 200, description: 'Casa de Paz deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or Casa de Paz is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'Casa de Paz not found.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.peaceHousesService.remove(id, user);
    return { data: null, message: 'Casa de Paz cerrada correctamente.' };
  }
}
