import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { PaginationMeta } from '@lcj/types';
import { ReportsService } from './reports.service';
import { ReportPreviewDto, ReportQueryDto, ReportTypeParamDto } from './dto/report.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Reportes consolidados y exportación (doc05: "Exportar Excel" ✅✅✅✅).
 *
 * READ ONLY. A report never writes.
 *
 * NO `scopeType` ON EITHER ROUTE, for the reason documented in
 * `OfferingsController` and `DashboardController`: `ScopeGuard` resolves ONE
 * resource id from the route params, and a report spans every Casa de Paz
 * the caller may see. The narrowing happens inside each report definition's
 * `where` clause instead — which for an export is not a detail, because the
 * output is a file that leaves the system and gets forwarded by e-mail.
 */
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermission('report', 'read')
  @Get(':type')
  @ApiParam({ name: 'type', enum: ['attendance', 'offerings', 'people', 'peace-houses'] })
  @ApiOperation({
    summary: 'Vista previa paginada de un reporte.',
    description:
      'Devuelve sus propias columnas junto con las filas: la pantalla no codifica encabezados por tipo de reporte, sino que dibuja lo que la definición declara — la misma lista que escribe el Excel.',
  })
  @ApiResponse({ status: 200, description: 'Reporte.', type: ReportPreviewDto })
  @ApiResponse({ status: 400, description: 'Tipo de reporte desconocido.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async preview(
    @Param() params: ReportTypeParamDto,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: ReportPreviewDto; meta: PaginationMeta }> {
    return this.reportsService.preview(params.type, query, user);
  }

  @RequirePermission('report', 'export')
  @Get(':type/export')
  @ApiParam({ name: 'type', enum: ['attendance', 'offerings', 'people', 'peace-houses'] })
  @ApiOperation({
    summary: 'Descarga el reporte completo en Excel.',
    description:
      'Sin paginar a propósito: exportar "página 1 de 47" no es un reporte, es una captura de pantalla. Un tope duro de filas impide que un filtro amplio agote la memoria del servidor.',
  })
  @ApiResponse({ status: 200, description: 'Archivo .xlsx.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async export(
    @Param() params: ReportTypeParamDto,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.reportsService.export(params.type, query, user);

    /*
     * Set by hand because this is the ONE route in the API that does not
     * return the `{success, message, data}` envelope — a spreadsheet is not
     * JSON. `Content-Disposition` is what makes the browser save it with a
     * meaningful name instead of rendering bytes.
     */
    response.set({
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });

    return new StreamableFile(buffer);
  }
}
