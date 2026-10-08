import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KidsChildrenService } from './kids-children.service';
import { CreateKidsChildDto } from './dto/create-kids-child.dto';
import { CreateKidsGuardianDto } from './dto/create-kids-guardian.dto';
import { KidsChildDetailResponseDto } from './dto/kids-child-detail-response.dto';
import { KidsChildGuardianResponseDto } from './dto/kids-child-guardian-response.dto';
import { KidsChildResponseDto } from './dto/kids-child-response.dto';
import { KidsConsentResponseDto } from './dto/kids-consent-response.dto';
import { KidsGuardianResponseDto } from './dto/kids-guardian-response.dto';
import { UpdateKidsChildDto } from './dto/update-kids-child.dto';
import { UpdateKidsConsentDto } from './dto/update-kids-consent.dto';
import { UpdateKidsGuardianDto } from './dto/update-kids-guardian.dto';
import { RequirePermission, ScopeResourceType } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Niños + acudientes + autorización — Fase 11, tercera parte ("Escuela
 * Kids"). KIDS_LEADER y KIDS_ASSISTANT comparten acceso operativo idéntico
 * en TODAS estas rutas (RN definitiva del diseño aprobado) — el permiso y
 * el scope, no el rol, son lo único que este controller distingue.
 */
@ApiTags('kids-children')
@ApiBearerAuth()
@Controller('kids')
export class KidsChildrenController {
  constructor(private readonly kidsChildrenService: KidsChildrenService) {}

  @RequirePermission('kids-child', 'create', {
    scopeType: ScopeResourceType.KIDS_SCHOOL,
    paramName: 'schoolId',
  })
  @Audit('KidsChild', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post('schools/:schoolId/children')
  @ApiParam({ name: 'schoolId' })
  @ApiOperation({
    summary: 'Registra un niño en una sede. Crea su KidsConsent en PENDING_AUTHORIZATION automáticamente.',
  })
  @ApiResponse({ status: 201, type: KidsChildDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsSchool is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  async createChild(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateKidsChildDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsChildDetailResponseDto> {
    return this.kidsChildrenService.createChild(schoolId, dto, user);
  }

  @RequirePermission('kids-child', 'list', {
    scopeType: ScopeResourceType.KIDS_SCHOOL,
    paramName: 'schoolId',
  })
  @Get('schools/:schoolId/children')
  @ApiParam({ name: 'schoolId' })
  @ApiOperation({ summary: 'Roster de niños de una sede (fuente del checklist de asistencia).' })
  @ApiResponse({ status: 200, type: [KidsChildResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsSchool is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsSchool not found.' })
  async listChildren(@Param('schoolId') schoolId: string): Promise<KidsChildResponseDto[]> {
    return this.kidsChildrenService.listChildren(schoolId);
  }

  @RequirePermission('kids-child', 'read', { scopeType: ScopeResourceType.KIDS_CHILD })
  @Get('children/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Perfil completo del niño: datos, acudientes y autorización (siempre visible, sea cual sea su estado).',
  })
  @ApiResponse({ status: 200, type: KidsChildDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsChild is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsChild not found.' })
  async getChild(@Param('id') id: string): Promise<KidsChildDetailResponseDto> {
    return this.kidsChildrenService.getChild(id);
  }

  @RequirePermission('kids-child', 'update', { scopeType: ScopeResourceType.KIDS_CHILD })
  @Audit('KidsChild', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch('children/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Actualiza los datos del niño.' })
  @ApiResponse({ status: 200, type: KidsChildDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsChild is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsChild not found.' })
  @ApiResponse({ status: 409, description: 'Version mismatch.' })
  async updateChild(
    @Param('id') id: string,
    @Body() dto: UpdateKidsChildDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsChildDetailResponseDto> {
    return this.kidsChildrenService.updateChild(id, dto, user);
  }

  @RequirePermission('kids-guardian', 'create', { scopeType: ScopeResourceType.KIDS_CHILD })
  @Audit('KidsChildGuardian', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post('children/:id/guardians')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Vincula un acudiente al niño — crea uno nuevo, o vincula uno existente (guardianId) para hermanos.',
  })
  @ApiResponse({ status: 201, type: KidsChildGuardianResponseDto })
  @ApiResponse({ status: 400, description: 'Missing required fields to create a new guardian.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsChild is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsChild or guardianId not found.' })
  @ApiResponse({ status: 409, description: 'Guardian already linked to this child.' })
  async addGuardian(
    @Param('id') id: string,
    @Body() dto: CreateKidsGuardianDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsChildGuardianResponseDto> {
    return this.kidsChildrenService.addGuardian(id, dto, user);
  }

  @RequirePermission('kids-guardian', 'update', { scopeType: ScopeResourceType.KIDS_GUARDIAN })
  @Audit('KidsGuardian', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch('guardians/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Edita los datos del acudiente (compartidos entre todos los niños vinculados).' })
  @ApiResponse({ status: 200, type: KidsGuardianResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permission, or none of the linked children are in your scope.',
  })
  @ApiResponse({ status: 404, description: 'KidsGuardian not found.' })
  @ApiResponse({ status: 409, description: 'Version mismatch.' })
  async updateGuardian(
    @Param('id') id: string,
    @Body() dto: UpdateKidsGuardianDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsGuardianResponseDto> {
    return this.kidsChildrenService.updateGuardian(id, dto, user);
  }

  @RequirePermission('kids-consent', 'upload', { scopeType: ScopeResourceType.KIDS_CHILD })
  @Audit('KidsConsent', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch('children/:id/consent')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Carga/reemplaza el documento de autorización, o cambia su estado manualmente (ej. revocar).',
    description:
      'documentPath presente → siempre transiciona a ACTIVE (primera carga o reemplazo). Sin documentPath, status permite una transición manual (ej. INACTIVE) sin tocar el documento ya cargado.',
  })
  @ApiResponse({ status: 200, type: KidsConsentResponseDto })
  @ApiResponse({ status: 400, description: 'Neither documentPath nor status was provided.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission, or KidsChild is outside of your scope.' })
  @ApiResponse({ status: 404, description: 'KidsChild or KidsConsent not found.' })
  async updateConsent(
    @Param('id') id: string,
    @Body() dto: UpdateKidsConsentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<KidsConsentResponseDto> {
    return this.kidsChildrenService.updateConsent(id, dto, user);
  }
}
