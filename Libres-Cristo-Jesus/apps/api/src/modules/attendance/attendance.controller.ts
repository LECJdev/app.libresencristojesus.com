import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
  ChecklistResponseDto,
  MarkAllDto,
  MarkAttendanceDto,
  UnlockMeetingDto,
} from './dto/attendance.dto';
import {
  RequirePermission,
  ScopeResourceType,
} from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Asistencia semanal (doc11 RN-407/RN-503/RN-504).
 *
 * PERMISSIONS (doc05 Matriz de Permisos)
 * "Registrar Asistencia" is ✅ for Administrador and Líder, ❌ for Pastores
 * Generales and Pastor Distrito. The Pastor de Distrito does NOT record
 * attendance — but RN-407 makes him the one who can REOPEN a closed week,
 * which is why `unlock` carries its own permission with the opposite
 * grant. Reading is open to all four: supervision requires seeing the
 * sheet without touching it.
 */
@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * The Casa de Paz travels as a PATH parameter, not in the body.
   *
   * `ScopeGuard` resolves the scoped resource from `request.params`, so an
   * id sent in the body is invisible to it: the guard found nothing and
   * answered "Missing resource identifier for scope check" — a 403 for the
   * Líder opening their OWN meeting, which is the module's main use. It
   * went unnoticed in a smoke test run as Administrador, because that role
   * is exempt from scope entirely.
   */
  @RequirePermission('attendance', 'read', {
    scopeType: ScopeResourceType.PEACE_HOUSE,
    paramName: 'peaceHouseId',
  })
  @Audit('Meeting', 'OPEN')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('peace-houses/:peaceHouseId/meetings/current')
  @ApiParam({ name: 'peaceHouseId' })
  @ApiOperation({
    summary: 'Abre la reunión de la semana ISO vigente, creándola si aún no existe (lazy).',
    description:
      'Idempotente bajo concurrencia: la restricción única (meetingScheduleId, isoYear, isoWeek) garantiza una sola reunión por Casa de Paz y semana.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de asistencia de la semana.',
    type: ChecklistResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Sin programación semanal activa o día no reconocible.',
  })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Permiso insuficiente o Casa de Paz fuera de su alcance.',
  })
  @ApiResponse({ status: 404, description: 'Casa de Paz no encontrada.' })
  async openCurrent(
    @Param('peaceHouseId') peaceHouseId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ChecklistResponseDto> {
    return this.attendanceService.openCurrentMeeting(peaceHouseId, user);
  }

  @RequirePermission('attendance', 'read', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Get('meetings/:meetingId')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({ summary: 'Lista de asistencia de una reunión, con su estado de bloqueo.' })
  @ApiResponse({ status: 200, description: 'Lista de asistencia.', type: ChecklistResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async getChecklist(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ChecklistResponseDto> {
    return this.attendanceService.getChecklist(meetingId, user);
  }

  @RequirePermission('attendance', 'register', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('Attendance', 'MARK')
  @UseInterceptors(AuditInterceptor)
  @Patch('meetings/:meetingId/people/:personId')
  @ApiParam({ name: 'meetingId' })
  @ApiParam({ name: 'personId' })
  @ApiOperation({ summary: 'Marca a una persona como presente o ausente.' })
  @ApiResponse({ status: 200, description: 'Lista actualizada.', type: ChecklistResponseDto })
  @ApiResponse({ status: 400, description: 'La persona no pertenece a esta Casa de Paz.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente o semana bloqueada.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async mark(
    @Param('meetingId') meetingId: string,
    @Param('personId') personId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ChecklistResponseDto> {
    return this.attendanceService.markAttendance(meetingId, personId, dto, user);
  }

  @RequirePermission('attendance', 'register', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('Attendance', 'MARK_ALL')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('meetings/:meetingId/mark-all')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({
    summary: 'Marca o desmarca a toda la lista. Un solo endpoint para ambas acciones.',
  })
  @ApiResponse({ status: 200, description: 'Lista actualizada.', type: ChecklistResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente o semana bloqueada.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async markAll(
    @Param('meetingId') meetingId: string,
    @Body() dto: MarkAllDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ChecklistResponseDto> {
    return this.attendanceService.markAll(meetingId, dto, user);
  }

  @RequirePermission('attendance', 'unlock', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('Meeting', 'UNLOCK')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('meetings/:meetingId/unlock')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({
    summary: 'Reabre una reunión bloqueada por 7 días calendario (doc11 RN-407).',
    description:
      'Cada reapertura crea un registro nuevo con usuario, fecha, vencimiento y motivo. Extender el plazo exige un nuevo desbloqueo, que deja su propia traza.',
  })
  @ApiResponse({ status: 200, description: 'Reunión reabierta.', type: ChecklistResponseDto })
  @ApiResponse({ status: 400, description: 'La reunión no está bloqueada.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Solo Administrador y Pastor de Distrito.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async unlock(
    @Param('meetingId') meetingId: string,
    @Body() dto: UnlockMeetingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ChecklistResponseDto> {
    return this.attendanceService.unlock(meetingId, dto, user);
  }
}
