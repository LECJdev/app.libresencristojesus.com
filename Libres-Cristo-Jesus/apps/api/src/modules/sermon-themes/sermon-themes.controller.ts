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
import { SermonThemesService } from './sermon-themes.service';
import {
  CreateSermonThemeDto,
  ListSermonThemesQueryDto,
  SermonThemeResponseDto,
  UpdateSermonThemeDto,
} from './dto/sermon-theme.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Catálogo de temas de predicación (doc04 §6).
 *
 * PERMISSIONS (doc05)
 * `create`/`update` follow "Registrar Reunión" — Administrador and Líder.
 * The catalog only stays useful if whoever prepares the teaching can add a
 * theme the moment they need it; requiring an administrator would push
 * every leader back to whatever free-text field they could find.
 * `delete` is Administrador only: a theme is shared by every Casa de Paz
 * that used it, so removing one is never a local decision.
 *
 * NO SCOPE CHECK: the catalog is global by nature. There is no "my theme".
 */
@ApiTags('sermon-themes')
@ApiBearerAuth()
@Controller('sermon-themes')
export class SermonThemesController {
  constructor(private readonly sermonThemesService: SermonThemesService) {}

  @RequirePermission('sermon-theme', 'list')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de temas, con búsqueda y filtro por serie.' })
  @ApiResponse({ status: 200, description: 'Temas.', type: [SermonThemeResponseDto] })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async findAll(
    @Query() query: ListSermonThemesQueryDto,
  ): Promise<{ data: SermonThemeResponseDto[]; meta: PaginationMeta }> {
    return this.sermonThemesService.findAll(query);
  }

  /** Declared BEFORE `:id` — otherwise "series" is read as an id. */
  @RequirePermission('sermon-theme', 'list')
  @Get('series')
  @ApiOperation({ summary: 'Series en uso, para agrupar los temas.' })
  @ApiResponse({ status: 200, description: 'Nombres de serie.', type: [String] })
  async findSeries(): Promise<string[]> {
    return this.sermonThemesService.findSeries();
  }

  @RequirePermission('sermon-theme', 'read')
  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Detalle de un tema.' })
  @ApiResponse({ status: 200, description: 'Tema.', type: SermonThemeResponseDto })
  @ApiResponse({ status: 404, description: 'Tema no encontrado.' })
  async findOne(@Param('id') id: string): Promise<SermonThemeResponseDto> {
    return this.sermonThemesService.findOne(id);
  }

  @RequirePermission('sermon-theme', 'create')
  @Audit('SermonTheme', 'CREATE')
  @UseInterceptors(AuditInterceptor)
  @Post()
  @ApiOperation({ summary: 'Registra un tema en el catálogo.' })
  @ApiResponse({ status: 201, description: 'Tema creado.', type: SermonThemeResponseDto })
  @ApiResponse({ status: 403, description: 'Solo Administrador y Líder.' })
  @ApiResponse({ status: 409, description: 'Ya existe un tema con este título.' })
  async create(
    @Body() dto: CreateSermonThemeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SermonThemeResponseDto> {
    return this.sermonThemesService.create(dto, user);
  }

  @RequirePermission('sermon-theme', 'update')
  @Audit('SermonTheme', 'UPDATE')
  @UseInterceptors(AuditInterceptor)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Actualiza un tema.' })
  @ApiResponse({ status: 200, description: 'Tema actualizado.', type: SermonThemeResponseDto })
  @ApiResponse({ status: 404, description: 'Tema no encontrado.' })
  @ApiResponse({ status: 409, description: 'Conflicto de versión o título duplicado.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSermonThemeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SermonThemeResponseDto> {
    return this.sermonThemesService.update(id, dto, user);
  }

  @RequirePermission('sermon-theme', 'delete')
  @Audit('SermonTheme', 'DELETE')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({
    summary: 'Elimina un tema (soft delete).',
    description:
      'Las reuniones que lo usaron siguen apuntando a él: borrarlo de verdad reescribiría la historia.',
  })
  @ApiResponse({ status: 204, description: 'Tema eliminado.' })
  @ApiResponse({ status: 403, description: 'Solo Administrador.' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado.' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.sermonThemesService.remove(id, user);
  }
}
