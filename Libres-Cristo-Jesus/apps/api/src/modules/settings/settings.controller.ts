import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SettingKeyParamDto, UpsertSettingDto } from './dto/upsert-setting.dto';
import { SettingResponseDto } from './dto/setting-response.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * System configuration (doc04 "Mejoras" §3, doc06 §21).
 *
 * PERMISSIONS
 * `list`/`read` are open to every authenticated role — settings drive how
 * the product behaves for everyone (timezone, PWA parameters), so the
 * client needs them regardless of who is signed in.
 *
 * `update`/`delete` are Administrador-only: doc05's Matriz de Permisos
 * gives "Configurar Sistema" ✅ solely to Administrador, ❌ to the other
 * three roles.
 */
@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @RequirePermission('setting', 'list')
  @Get()
  @ApiOperation({ summary: 'List every system setting, ordered by key.' })
  @ApiResponse({ status: 200, description: 'Settings.', type: [SettingResponseDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async findAll(): Promise<SettingResponseDto[]> {
    return this.settingsService.findAll();
  }

  @RequirePermission('setting', 'read')
  @Get(':key')
  @ApiParam({ name: 'key', example: 'church.timezone' })
  @ApiOperation({ summary: 'Read one setting by key.' })
  @ApiResponse({ status: 200, description: 'Setting found.', type: SettingResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Setting not found.' })
  async findOne(@Param() params: SettingKeyParamDto): Promise<SettingResponseDto> {
    return this.settingsService.findOne(params.key);
  }

  @RequirePermission('setting', 'update')
  @Audit('SystemSetting', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Put(':key')
  @ApiParam({ name: 'key', example: 'church.timezone' })
  @ApiOperation({
    summary: 'Create or update a setting (doc06 §20: every configuration change is audited).',
  })
  @ApiResponse({ status: 200, description: 'Setting saved.', type: SettingResponseDto })
  @ApiResponse({ status: 400, description: 'Malformed key or body.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  async upsert(
    @Param() params: SettingKeyParamDto,
    @Body() dto: UpsertSettingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SettingResponseDto> {
    return this.settingsService.upsert(params.key, dto, user);
  }

  @RequirePermission('setting', 'delete')
  @Audit('SystemSetting', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Delete(':key')
  @ApiParam({ name: 'key' })
  @ApiOperation({ summary: 'Soft-delete a setting so it falls back to its default.' })
  @ApiResponse({ status: 200, description: 'Setting removed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permission.' })
  @ApiResponse({ status: 404, description: 'Setting not found.' })
  async remove(
    @Param() params: SettingKeyParamDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    await this.settingsService.remove(params.key, user);
    return { data: null, message: 'Configuración eliminada correctamente.' };
  }
}
