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
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { ListPermissionsQueryDto } from './dto/list-permissions-query.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';
import { RolePermissionResponseDto } from './dto/role-permission-response.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * `Permission`/`RolePermission` management — Fase 4. `Permission` and
 * `RolePermission` are not part of `Documentos/04-modelo-de-datos.md`;
 * they're a deliberate architecture decision (see `PermissionsService`
 * doc comment) replacing doc05's conceptual "Matriz de Permisos" with a
 * real, manageable table. Every route is protected by
 * `@RequirePermission(<resource>, <action>)`, read by the already-global
 * `ScopeGuard` — no per-route `@UseGuards(...)` needed, no `scopeType`
 * either (permission management is never scoped to a District/Casa de
 * Paz — doc05 keeps every security-configuration capability
 * Administrador-only, and `prisma/seed.ts` grants the `permission`/
 * `role-permission` resources to Administrador exclusively).
 *
 * Route order matters here: `role-assignments`/`roles/:roleId` are
 * declared before the generic `:id` routes so Nest's path matching never
 * has to disambiguate them (different segment depths already guarantee
 * no collision, but keeping specific routes first matches this
 * codebase's convention and reads unambiguously top to bottom).
 */
@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @RequirePermission('role-permission', 'create')
  @Audit('RolePermission', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post('role-assignments')
  @ApiOperation({ summary: 'Grant a Permission to a CatRole (creates a RolePermission row).' })
  @ApiResponse({ status: 201, description: 'Grant created.', type: RolePermissionResponseDto })
  @ApiResponse({ status: 400, description: 'roleId or permissionId does not match any known row.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 409, description: 'This role already has this permission granted.' })
  async createRoleAssignment(
    @Body() dto: CreateRoleAssignmentDto,
  ): Promise<RolePermissionResponseDto> {
    return this.permissionsService.createRoleAssignment(dto);
  }

  @RequirePermission('role-permission', 'delete')
  @Audit('RolePermission', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete('role-assignments/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Revoke a Permission from a CatRole (deletes the RolePermission row).' })
  @ApiResponse({ status: 200, description: 'Grant revoked.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Grant not found.' })
  async removeRoleAssignment(@Param('id') id: string): Promise<{ data: null; message: string }> {
    await this.permissionsService.removeRoleAssignment(id);
    return { data: null, message: 'Permiso revocado correctamente.' };
  }

  @RequirePermission('role-permission', 'list')
  @Get('roles/:roleId')
  @ApiParam({ name: 'roleId' })
  @ApiOperation({ summary: 'List every Permission granted to a CatRole.' })
  @ApiResponse({ status: 200, description: 'Grant list.', type: [RolePermissionResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async findRolePermissions(@Param('roleId') roleId: string): Promise<RolePermissionResponseDto[]> {
    return this.permissionsService.findRolePermissions(roleId);
  }

  @RequirePermission('permission', 'create')
  @Audit('Permission', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Add a (resource, action) row to the Permission catalog.' })
  @ApiResponse({ status: 201, description: 'Permission created.', type: PermissionResponseDto })
  @ApiResponse({ status: 400, description: 'Malformed request body.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({
    status: 409,
    description: 'A permission with this resource/action already exists.',
  })
  async create(
    @Body() dto: CreatePermissionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.create(dto, user);
  }

  @RequirePermission('permission', 'list')
  @Get()
  @ApiOperation({ summary: 'List permissions (Permission catalog), paginated.' })
  @ApiResponse({ status: 200, description: 'Paginated permission list.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(
    @Query() query: ListPermissionsQueryDto,
  ): Promise<{ data: PermissionResponseDto[]; meta: PaginationMeta }> {
    return this.permissionsService.findAll(query);
  }

  @RequirePermission('permission', 'read')
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Get a single permission by id.' })
  @ApiResponse({ status: 200, description: 'Permission found.', type: PermissionResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Permission not found.' })
  async findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  @RequirePermission('permission', 'update')
  @Audit('Permission', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: "Update a permission's description. resource/action are immutable once created.",
  })
  @ApiResponse({ status: 200, description: 'Permission updated.', type: PermissionResponseDto })
  @ApiResponse({ status: 400, description: 'Malformed request body.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Permission not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.update(id, dto, user);
  }

  @RequirePermission('permission', 'delete')
  @Audit('Permission', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary:
      'Soft-delete a permission — rejected with 409 if it still has active RolePermission grants.',
  })
  @ApiResponse({ status: 200, description: 'Permission deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Permission not found.' })
  @ApiResponse({ status: 409, description: 'Permission still has active RolePermission grants.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.permissionsService.remove(id, user);
    return { data: null, message: 'Permiso eliminado correctamente.' };
  }
}
