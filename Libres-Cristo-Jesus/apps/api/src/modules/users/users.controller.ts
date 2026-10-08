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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * `LeadershipUnit` ("Usuarios") CRUD — doc19 section 8 "USERS". Every
 * route is protected by `@RequirePermission('user', <action>)`, read by
 * the already-global `ScopeGuard` (`CommonModule`'s `APP_GUARD` chain) —
 * no per-route `@UseGuards(...)` needed. `user` has no `ScopeResourceType`
 * entry (only `peaceHouse`/`district` do), matching doc05: Users
 * management is never scoped below "does this role have the permission at
 * all" — Pastor Distrito's narrower "Líder only" rule is a business rule
 * on WHICH role can be assigned, not a resource-ownership scope, so it's
 * enforced in `UsersService.assertCanAssignRole` instead.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermission('user', 'create')
  @Audit('LeadershipUnit', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Create a LeadershipUnit (user) with up to 2 LeadershipMembers.' })
  @ApiResponse({ status: 201, description: 'User created.', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Malformed request body, or roleId does not exist.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or not allowed to assign that role.',
  })
  @ApiResponse({ status: 409, description: 'Username already in use.' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, user);
  }

  @RequirePermission('user', 'list')
  @Get()
  @ApiOperation({ summary: 'List users (LeadershipUnits), paginated.' })
  @ApiResponse({ status: 200, description: 'Paginated user list.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(
    @Query() query: ListUsersQueryDto,
  ): Promise<{ data: UserResponseDto[]; meta: PaginationMeta }> {
    return this.usersService.findAll(query);
  }

  @RequirePermission('user', 'read')
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Get a single user (LeadershipUnit) by id.' })
  @ApiResponse({ status: 200, description: 'User found.', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @RequirePermission('user', 'update')
  @Audit('LeadershipUnit', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Update a user (LeadershipUnit) and/or its LeadershipMembers.' })
  @ApiResponse({ status: 200, description: 'User updated.', type: UserResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Malformed request body, roleId does not exist, or more than 2 members.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({
    status: 409,
    description: 'Version mismatch (optimistic locking conflict), or username already in use.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, user);
  }

  @RequirePermission('user', 'change-password')
  @Audit('LeadershipUnit', 'CHANGE_PASSWORD')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Patch(':id/password')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: "Reset a user's password (Administrador only — doc05 Rol 1 'Cambiar contraseñas').",
  })
  @ApiResponse({ status: 200, description: 'Password updated.' })
  @ApiResponse({ status: 400, description: 'Malformed request body.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Version mismatch (optimistic locking conflict).' })
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.usersService.changePassword(id, dto, user);
    return { data: null, message: 'Contraseña actualizada correctamente.' };
  }

  @RequirePermission('user', 'delete')
  @Audit('LeadershipUnit', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary:
      'Soft-delete a user (LeadershipUnit) — deletedAt/deletedBy/status, never a hard delete.',
  })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.usersService.remove(id, user);
    return { data: null, message: 'Usuario eliminado correctamente.' };
  }
}
