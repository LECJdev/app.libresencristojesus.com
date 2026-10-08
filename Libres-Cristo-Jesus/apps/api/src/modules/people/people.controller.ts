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
import { PeopleService } from './people.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { TransferPersonDto, UpdatePersonDto } from './dto/update-person.dto';
import { ListPeopleQueryDto } from './dto/list-people-query.dto';
import { AttendanceRatesQueryDto } from './dto/attendance-rates-query.dto';
import {
  PersonAttendanceRateDto,
  PersonAttendanceRowDto,
  PersonHistoryResponseDto,
  PersonResponseDto,
} from './dto/person-response.dto';
import {
  RequirePermission,
  ScopeResourceType,
} from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * `Person` ("Personas") CRUD — Fase 7 (doc04 §5).
 *
 * PERMISSIONS (doc05)
 * The matrix has no "Personas" row, but Rol 4's own capability list gives
 * the Líder the registration and follow-up of attendees of their Casa de
 * Paz — which is the whole point of the module — and Rol 1/Rol 2/Rol 3
 * supervise it. So all four roles get create/list/read/update; `delete`
 * (a soft delete that removes someone from every roster) is kept to
 * Administrador, Pastor General and Pastor Distrito, matching how
 * `peace-house:delete` is granted.
 *
 * SCOPE (doc05 Policies 1-2 for WRITES; explicit product exception for READS)
 * - `update`/`transfer`/`delete` carry `scopeType: PERSON` (`ScopeGuard`,
 *   resolved through the person's open membership period): a Líder may
 *   only administer someone currently in their own Casa de Paz.
 * - `read`/`list` carry no `scopeType`: viewing a person — like viewing a
 *   Casa de Paz (`PeaceHousesController`) or the Organigrama — is open to
 *   every role. `PeopleService.findAll` only narrows the UN-FILTERED
 *   listing (no `peaceHouseId`), so it never becomes a backdoor into the
 *   whole church's roster.
 */
@ApiTags('people')
@ApiBearerAuth()
@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @RequirePermission('person', 'create')
  @Audit('Person', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({
    summary: 'Registrar una persona. Solo nombres y apellidos son obligatorios.',
  })
  @ApiResponse({ status: 201, description: 'Persona creada.', type: PersonResponseDto })
  @ApiResponse({ status: 400, description: 'Cuerpo inválido o etapa inexistente.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'peaceHouseId inexistente.' })
  @ApiResponse({ status: 409, description: 'Documento ya registrado.' })
  async create(
    @Body() dto: CreatePersonDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonResponseDto> {
    return this.peopleService.create(dto, user);
  }

  @RequirePermission('person', 'list')
  @Get()
  @ApiOperation({
    summary: 'Listar personas — paginado, con búsqueda y filtros por Casa de Paz, etapa y estado.',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async findAll(
    @Query() query: ListPeopleQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: PersonResponseDto[]; meta: PaginationMeta }> {
    return this.peopleService.findAll(query, user);
  }

  /**
   * Declared BEFORE `GET /:id` — Nest matches in declaration order, and a
   * parameterised route first would swallow every literal path below it.
   */
  @RequirePermission('person', 'list')
  @Get('stages')
  @ApiOperation({ summary: 'Catálogo de etapas del proceso pastoral, en orden de progresión.' })
  @ApiResponse({ status: 200, description: 'Etapas.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async findStages(): Promise<{ id: string; name: string; sortOrder: number }[]> {
    return this.peopleService.findStages();
  }

  /**
   * Declared BEFORE `GET /:id` for the same reason as `stages` above — a
   * literal path has to come first or `:id` swallows it.
   */
  @RequirePermission('person', 'list')
  @Get('attendance-rates')
  @ApiOperation({
    summary: 'Tasa de asistencia de cada integrante activo del roster de una Casa de Paz.',
  })
  @ApiResponse({ status: 200, description: 'Tasas.', type: [PersonAttendanceRateDto] })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async findAttendanceRates(
    @Query() query: AttendanceRatesQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonAttendanceRateDto[]> {
    return this.peopleService.findAttendanceRates(query.peaceHouseId, user);
  }

  @RequirePermission('person', 'read')
  @Get(':id/history')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Historial de Casas de Paz de la persona, más reciente primero.' })
  @ApiResponse({ status: 200, description: 'Historial.', type: [PersonHistoryResponseDto] })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  async findHistory(@Param('id') id: string): Promise<PersonHistoryResponseDto[]> {
    return this.peopleService.findHistory(id);
  }

  @RequirePermission('person', 'read')
  @Get(':id/attendance')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Reuniones de su Casa de Paz desde que ingresó, con presente/ausente en cada una.',
  })
  @ApiResponse({ status: 200, description: 'Asistencia.', type: [PersonAttendanceRowDto] })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  async findAttendance(@Param('id') id: string): Promise<PersonAttendanceRowDto[]> {
    return this.peopleService.findAttendance(id);
  }

  @RequirePermission('person', 'read')
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Obtener una persona por id.' })
  @ApiResponse({ status: 200, description: 'Persona encontrada.', type: PersonResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  async findOne(@Param('id') id: string): Promise<PersonResponseDto> {
    return this.peopleService.findOne(id);
  }

  @RequirePermission('person', 'update', { scopeType: ScopeResourceType.PERSON })
  @Audit('Person', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Actualizar una persona. Un peaceHouseId distinto produce un traslado.',
  })
  @ApiResponse({ status: 200, description: 'Persona actualizada.', type: PersonResponseDto })
  @ApiResponse({ status: 400, description: 'Cuerpo inválido o etapa inexistente.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  @ApiResponse({ status: 409, description: 'Versión desactualizada o documento duplicado.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonResponseDto> {
    return this.peopleService.update(id, dto, user);
  }

  @RequirePermission('person', 'update', { scopeType: ScopeResourceType.PERSON })
  @Audit('Person', 'TRANSFER')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post(':id/transfer')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Trasladar a otra Casa de Paz, cerrando el período abierto y abriendo el siguiente.',
  })
  @ApiResponse({ status: 200, description: 'Traslado realizado.', type: PersonResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'Persona o Casa de Paz no encontrada.' })
  async transfer(
    @Param('id') id: string,
    @Body() dto: TransferPersonDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonResponseDto> {
    return this.peopleService.transfer(id, dto, user);
  }

  @RequirePermission('person', 'delete', { scopeType: ScopeResourceType.PERSON })
  @Audit('Person', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Eliminación lógica. El historial de Casas de Paz se conserva intacto.',
  })
  @ApiResponse({ status: 200, description: 'Persona eliminada.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.peopleService.remove(id, user);
    return { data: null, message: 'Persona eliminada correctamente.' };
  }
}
