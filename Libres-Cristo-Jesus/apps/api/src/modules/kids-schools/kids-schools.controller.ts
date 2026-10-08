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
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KidsSchoolsService } from './kids-schools.service';
import { CreateKidsAssignmentDto } from './dto/create-kids-assignment.dto';
import { CreateKidsSchoolDto } from './dto/create-kids-school.dto';
import { KidsAssignmentResponseDto } from './dto/kids-assignment-response.dto';
import { KidsSchoolResponseDto } from './dto/kids-school-response.dto';
import { UpdateKidsSchoolDto } from './dto/update-kids-school.dto';
import {
  RequirePermission,
  ScopeResourceType,
} from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * `KidsSchool` (sede de Escuela Kids) + `KidsUserAssignment` (líder/
 * auxiliares) — Fase 11. Módulo independiente de `peace-houses`, mismo
 * estilo de controller (un solo `@RequirePermission(...)` por ruta, leído
 * por el `ScopeGuard` global — sin `@UseGuards(...)` por ruta).
 */
@ApiTags('kids-schools')
@ApiBearerAuth()
@Controller('kids/schools')
export class KidsSchoolsController {
  constructor(private readonly kidsSchoolsService: KidsSchoolsService) {}

  @RequirePermission('kids-school', 'create')
  @Audit('KidsSchool', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({ summary: 'Crea una sede de Escuela Kids. Solo ADMIN.' })
  @ApiResponse({ status: 201, description: 'KidsSchool created.', type: KidsSchoolResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 409, description: 'A KidsSchool with this name already exists.' })
  async create(
    @Body() dto: CreateKidsSchoolDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsSchoolResponseDto> {
    return this.kidsSchoolsService.create(dto, user);
  }

  @RequirePermission('kids-school', 'list')
  @Get()
  @ApiOperation({
    summary: 'Lista sedes de Escuela Kids.',
    description:
      'ADMIN ve todas. KIDS_LEADER/KIDS_ASSISTANT solo ven la(s) sede(s) donde tienen una asignación activa.',
  })
  @ApiResponse({ status: 200, description: 'KidsSchool list.', type: [KidsSchoolResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(@CurrentUser() user: JwtPayload): Promise<KidsSchoolResponseDto[]> {
    return this.kidsSchoolsService.findAll(user);
  }

  @RequirePermission('kids-school', 'read', { scopeType: ScopeResourceType.KIDS_SCHOOL })
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Obtiene una sede de Escuela Kids por id.' })
  @ApiResponse({ status: 200, description: 'KidsSchool found.', type: KidsSchoolResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or KidsSchool is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  async findOne(@Param('id') id: string): Promise<KidsSchoolResponseDto> {
    return this.kidsSchoolsService.findOne(id);
  }

  @RequirePermission('kids-school', 'update', { scopeType: ScopeResourceType.KIDS_SCHOOL })
  @Audit('KidsSchool', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Actualiza una sede de Escuela Kids. Solo ADMIN.' })
  @ApiResponse({ status: 200, description: 'KidsSchool updated.', type: KidsSchoolResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or KidsSchool is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  @ApiResponse({ status: 409, description: 'Version mismatch, or duplicate name.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateKidsSchoolDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsSchoolResponseDto> {
    return this.kidsSchoolsService.update(id, dto, user);
  }

  @RequirePermission('kids-school', 'delete', { scopeType: ScopeResourceType.KIDS_SCHOOL })
  @Audit('KidsSchool', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Cierra (soft-delete) una sede de Escuela Kids. Solo ADMIN — nunca un borrado físico.' })
  @ApiResponse({ status: 200, description: 'KidsSchool closed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or KidsSchool is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.kidsSchoolsService.remove(id, user);
    return { data: null, message: 'Sede cerrada correctamente.' };
  }

  @RequirePermission('kids-assignment', 'list', { scopeType: ScopeResourceType.KIDS_SCHOOL })
  @Get(':id/assignments')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Lista el equipo activo (líder + auxiliares) de una sede.',
    description:
      'ADMIN y el KIDS_LEADER de esa sede — no concedido a KIDS_ASSISTANT (gestionar el equipo es administrativo, no operativo).',
  })
  @ApiResponse({
    status: 200,
    description: 'Active assignments.',
    type: [KidsAssignmentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or KidsSchool is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  async listAssignments(@Param('id') id: string): Promise<KidsAssignmentResponseDto[]> {
    return this.kidsSchoolsService.listAssignments(id);
  }

  @RequirePermission('kids-assignment', 'create', { scopeType: ScopeResourceType.KIDS_SCHOOL })
  @Audit('KidsUserAssignment', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/assignments')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Asigna un líder o auxiliar a una sede.',
    description:
      'role: LEADER — solo ADMIN; cierra la asignación de líder anterior y crea la nueva en la misma transacción (nunca dos líderes activos). role: ASSISTANT — ADMIN o el KIDS_LEADER de esa misma sede.',
  })
  @ApiResponse({ status: 201, description: 'Assignment created.', type: KidsAssignmentResponseDto })
  @ApiResponse({ status: 400, description: 'leadershipUnitId does not hold the expected role.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permission, KidsSchool is outside of your scope, or a non-ADMIN tried to assign a LEADER.',
  })
  @ApiResponse({ status: 404, description: 'KidsSchool or leadershipUnitId not found.' })
  @ApiResponse({
    status: 409,
    description:
      'leadershipUnitId is already active at another school, already active here, or a concurrency conflict.',
  })
  async createAssignment(
    @Param('id') id: string,
    @Body() dto: CreateKidsAssignmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsAssignmentResponseDto> {
    return this.kidsSchoolsService.createAssignment(id, dto, user);
  }

  @RequirePermission('kids-assignment', 'delete', { scopeType: ScopeResourceType.KIDS_SCHOOL })
  @Audit('KidsUserAssignment', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id/assignments/:assignmentId')
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'assignmentId' })
  @ApiOperation({
    summary: 'Retira un auxiliar de una sede (cierra la asignación, nunca la borra).',
    description: 'No permite retirar al LEADER por esta vía — usar POST assignments con role LEADER para reemplazarlo.',
  })
  @ApiResponse({ status: 200, description: 'Assignment closed.' })
  @ApiResponse({ status: 400, description: 'Cannot remove a LEADER assignment directly.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or KidsSchool is outside of your scope.',
  })
  @ApiResponse({ status: 404, description: 'KidsSchool or assignment not found.' })
  async removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.kidsSchoolsService.removeAssignment(id, assignmentId, user);
    return { data: null, message: 'Auxiliar retirado correctamente.' };
  }
}
