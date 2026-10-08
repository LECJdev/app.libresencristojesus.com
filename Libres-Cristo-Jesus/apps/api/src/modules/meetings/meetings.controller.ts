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
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import {
  AddMeetingPhotoDto,
  MeetingReportResponseDto,
  UpdateMeetingPhotoDto,
  UpdateMeetingReportDto,
  UpsertOfferingDto,
} from './dto/meeting-report.dto';
import {
  RequirePermission,
  ScopeResourceType,
} from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Registro de la reunión: tema, predicador, observaciones, ofrenda y
 * fotografías (doc01 RF-022..RF-026, doc07 US-013/US-016/US-017).
 *
 * PERMISSIONS (doc05 Matriz de Permisos)
 * "Registrar Reunión" and "Registrar Ofrenda" are both ✅ Administrador /
 * ✅ Líder and ❌ for the two pastor roles: they supervise the report, they
 * do not fill it in. Reading is open to all four.
 *
 * EVERY ROUTE IS SCOPED BY `MEETING`.
 * Without it these routes would take a `meetingId` no guard could resolve,
 * and any authenticated Líder could report on any Casa de Paz in the
 * country — the exact hole found and closed in the attendance controller.
 */
@ApiTags('meetings')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @RequirePermission('meeting', 'read', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Get(':meetingId/report')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({
    summary: 'Reporte completo de la reunión: tema, predicador, ofrenda, fotos y bloqueo.',
  })
  @ApiResponse({ status: 200, description: 'Reporte.', type: MeetingReportResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente o reunión fuera de su alcance.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async getReport(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MeetingReportResponseDto> {
    return this.meetingsService.getReport(meetingId, user);
  }

  @RequirePermission('meeting', 'register', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('Meeting', 'REPORT')
  @UseInterceptors(AuditInterceptor)
  @Patch(':meetingId/report')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({ summary: 'Registra tema, predicador y observaciones (RF-022/023/024).' })
  @ApiResponse({ status: 200, description: 'Reporte actualizado.', type: MeetingReportResponseDto })
  @ApiResponse({ status: 400, description: 'themeId no corresponde a ningún tema activo.' })
  @ApiResponse({ status: 403, description: 'Solo Administrador y Líder, o semana bloqueada.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async updateReport(
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateMeetingReportDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MeetingReportResponseDto> {
    return this.meetingsService.updateReport(meetingId, dto, user);
  }

  @RequirePermission('offering', 'register', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('Offering', 'REGISTER')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Put(':meetingId/offering')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({
    summary: 'Registra o corrige la ofrenda de la reunión (RN-039: una sola).',
    description:
      'PUT y no POST: hay exactamente una ofrenda por reunión, así que registrarla y corregirla son el mismo acto sobre el mismo recurso.',
  })
  @ApiResponse({ status: 200, description: 'Reporte actualizado.', type: MeetingReportResponseDto })
  @ApiResponse({ status: 400, description: 'Monto negativo o con más de dos decimales.' })
  @ApiResponse({ status: 403, description: 'Solo Administrador y Líder, o semana bloqueada.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async upsertOffering(
    @Param('meetingId') meetingId: string,
    @Body() dto: UpsertOfferingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MeetingReportResponseDto> {
    return this.meetingsService.upsertOffering(meetingId, dto, user);
  }

  @RequirePermission('offering', 'register', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('Offering', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':meetingId/offering')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({
    summary: 'Elimina una ofrenda registrada por error (soft delete).',
    description: 'El registro sobrevive: RN-042 exige que todo movimiento quede trazado.',
  })
  @ApiResponse({ status: 200, description: 'Reporte actualizado.', type: MeetingReportResponseDto })
  @ApiResponse({ status: 404, description: 'La reunión no tiene ofrenda registrada.' })
  async removeOffering(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MeetingReportResponseDto> {
    return this.meetingsService.removeOffering(meetingId, user);
  }

  @RequirePermission('meeting', 'register', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('MeetingPhoto', 'ADD')
  @UseInterceptors(AuditInterceptor)
  @Post(':meetingId/photos')
  @ApiParam({ name: 'meetingId' })
  @ApiOperation({
    summary: 'Añade una fotografía ya subida (RF-025, RN-043).',
    description:
      'Recibe la RUTA devuelta por POST /files/upload, nunca el binario. Varias por reunión.',
  })
  @ApiResponse({ status: 201, description: 'Reporte actualizado.', type: MeetingReportResponseDto })
  @ApiResponse({ status: 403, description: 'Solo Administrador y Líder, o semana bloqueada.' })
  @ApiResponse({ status: 404, description: 'Reunión no encontrada.' })
  async addPhoto(
    @Param('meetingId') meetingId: string,
    @Body() dto: AddMeetingPhotoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MeetingReportResponseDto> {
    return this.meetingsService.addPhoto(meetingId, dto, user);
  }

  @RequirePermission('meeting', 'register', {
    scopeType: ScopeResourceType.MEETING,
    paramName: 'meetingId',
  })
  @Audit('MeetingPhoto', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':meetingId/photos/:photoId')
  @ApiParam({ name: 'meetingId' })
  @ApiParam({ name: 'photoId' })
  @ApiOperation({
    summary: 'Pie de foto, orden y ocultamiento (RN-044).',
    description:
      'Ocultar no es eliminar: el registro y el archivo permanecen, la galería deja de mostrarla. hidden:false la restituye.',
  })
  @ApiResponse({ status: 200, description: 'Reporte actualizado.', type: MeetingReportResponseDto })
  @ApiResponse({ status: 403, description: 'Solo Administrador y Líder, o semana bloqueada.' })
  @ApiResponse({ status: 404, description: 'Reunión o fotografía no encontrada.' })
  async updatePhoto(
    @Param('meetingId') meetingId: string,
    @Param('photoId') photoId: string,
    @Body() dto: UpdateMeetingPhotoDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MeetingReportResponseDto> {
    return this.meetingsService.updatePhoto(meetingId, photoId, dto, user);
  }
}
