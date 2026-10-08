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
import { KidsAttendanceService } from './kids-attendance.service';
import {
  KidsChecklistResponseDto,
  MarkAllKidsDto,
  MarkKidsAttendanceDto,
} from './dto/kids-attendance.dto';
import { KidsSchoolMetricsResponseDto } from './dto/kids-metrics.dto';
import {
  RequirePermission,
  ScopeResourceType,
} from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Reuniones + asistencia semanal + métricas de sede — Fase 11, cuarta parte
 * ("Escuela Kids"). KIDS_LEADER y KIDS_ASSISTANT comparten acceso operativo
 * idéntico en TODAS estas rutas, igual que `kids-children`.
 */
@ApiTags('kids-attendance')
@ApiBearerAuth()
@Controller('kids')
export class KidsAttendanceController {
  constructor(private readonly kidsAttendanceService: KidsAttendanceService) {}

  @RequirePermission('kids-attendance', 'read', {
    scopeType: ScopeResourceType.KIDS_SCHOOL,
    paramName: 'schoolId',
  })
  @Audit('KidsMeeting', 'OPEN')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('schools/:schoolId/meetings/current')
  @ApiParam({ name: 'schoolId' })
  @ApiOperation({
    summary: 'Abre la reunión de la semana ISO vigente de la sede, creándola si aún no existe (lazy).',
  })
  @ApiResponse({ status: 200, type: KidsChecklistResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsSchool is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  async openCurrent(
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    return this.kidsAttendanceService.openCurrentMeeting(schoolId, user);
  }

  @RequirePermission('kids-attendance', 'read', { scopeType: ScopeResourceType.KIDS_SCHOOL, paramName: 'schoolId' })
  @Get('schools/:schoolId/metrics')
  @ApiParam({ name: 'schoolId' })
  @ApiOperation({ summary: 'Métricas de asistencia y autorización de una sede, para el dashboard.' })
  @ApiResponse({ status: 200, type: KidsSchoolMetricsResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsSchool is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  async getMetrics(@Param('schoolId') schoolId: string): Promise<KidsSchoolMetricsResponseDto> {
    return this.kidsAttendanceService.getMetrics(schoolId);
  }

  @RequirePermission('kids-attendance', 'read', {
    scopeType: ScopeResourceType.KIDS_MEETING,
    paramName: 'meetingId',
  })
  @Get('meetings/:meetingId')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({ summary: 'Checklist de asistencia de una reunión.' })
  @ApiResponse({ status: 200, type: KidsChecklistResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsMeeting is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsMeeting not found.' })
  async getChecklist(@Param('meetingId') meetingId: string): Promise<KidsChecklistResponseDto> {
    return this.kidsAttendanceService.getChecklist(meetingId);
  }

  @RequirePermission('kids-attendance', 'mark', {
    scopeType: ScopeResourceType.KIDS_MEETING,
    paramName: 'meetingId',
  })
  @Audit('KidsAttendance', 'MARK')
  @UseInterceptors(AuditInterceptor)
  @Patch('meetings/:meetingId/children/:childId')
  @ApiParam({ name: 'meetingId' })
  @ApiParam({ name: 'childId' })
  @ApiOperation({ summary: 'Marca a un niño como presente o ausente.' })
  @ApiResponse({ status: 200, type: KidsChecklistResponseDto })
  @ApiResponse({ status: 400, description: 'El niño no pertenece a esta sede.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsMeeting is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsMeeting not found.' })
  async mark(
    @Param('meetingId') meetingId: string,
    @Param('childId') childId: string,
    @Body() dto: MarkKidsAttendanceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    return this.kidsAttendanceService.markAttendance(meetingId, childId, dto, user);
  }

  @RequirePermission('kids-attendance', 'mark', {
    scopeType: ScopeResourceType.KIDS_MEETING,
    paramName: 'meetingId',
  })
  @Audit('KidsAttendance', 'MARK_ALL')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('meetings/:meetingId/mark-all')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({ summary: 'Marca presentes a todo el roster, o a un subconjunto.' })
  @ApiResponse({ status: 200, type: KidsChecklistResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsMeeting is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsMeeting not found.' })
  async markAll(
    @Param('meetingId') meetingId: string,
    @Body() dto: MarkAllKidsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    return this.kidsAttendanceService.markAll(meetingId, dto, user);
  }

  @RequirePermission('kids-attendance', 'mark', {
    scopeType: ScopeResourceType.KIDS_MEETING,
    paramName: 'meetingId',
  })
  @Audit('KidsAttendance', 'UNMARK_ALL')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('meetings/:meetingId/unmark-all')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({ summary: 'Desmarca a todo el roster, o a un subconjunto.' })
  @ApiResponse({ status: 200, type: KidsChecklistResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsMeeting is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsMeeting not found.' })
  async unmarkAll(
    @Param('meetingId') meetingId: string,
    @Body() dto: MarkAllKidsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsChecklistResponseDto> {
    return this.kidsAttendanceService.unmarkAll(meetingId, dto, user);
  }
}
