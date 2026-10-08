import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RoleResponseDto } from './dto/role-response.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';

/**
 * `CatRole` ("Roles") — read-only catalog, doc04 §4 / doc05. See
 * `RolesService` for why this module deliberately has no create/update/
 * delete: the 4 roles are a fixed catalog seeded at the DB level, and
 * doc05 never lists role-catalog CRUD as a capability of any role (only
 * "Administrar catálogos" for Administrador in general, which the Users
 * module's `roleId` assignment rules — `UsersService.assertCanAssignRole`
 * — already cover for the one place roles are actually assigned).
 * Every route is protected by `@RequirePermission('role', <action>)`, read
 * by the already-global `ScopeGuard` — no per-route `@UseGuards(...)`
 * needed, no `scopeType` either (the role catalog isn't scoped to a
 * District/Casa de Paz).
 */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermission('role', 'list')
  @Get()
  @ApiOperation({ summary: 'List all roles (CatRole) — a fixed catalog of 4 entries.' })
  @ApiResponse({ status: 200, description: 'Role list.', type: [RoleResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @RequirePermission('role', 'read')
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Get a single role (CatRole) by id.' })
  @ApiResponse({ status: 200, description: 'Role found.', type: RoleResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async findOne(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }
}
