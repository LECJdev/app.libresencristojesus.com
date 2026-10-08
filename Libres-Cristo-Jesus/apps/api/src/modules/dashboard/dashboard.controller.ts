import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DashboardSummaryDto,
  DashboardTrendsDto,
  DashboardTrendsQueryDto,
  MapStatsDto,
} from './dto/dashboard.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Indicadores del Dashboard (doc11 §Dashboard, RN-1301/RN-1302).
 *
 * READ ONLY. RN-1301 requires every indicator to be computed, never typed
 * in, so there is deliberately no write surface here at all.
 *
 * NO `scopeType` ON ANY ROUTE. `ScopeGuard` resolves ONE resource id out of
 * the route params, and an aggregate has none — it spans every Casa de Paz
 * the caller may see. `DashboardService` therefore narrows every `where`
 * clause with `peaceHouseScopeFilter` instead, which is the same rule the
 * guard applies to a single row. This is the documented pattern from
 * `OfferingsController`, not an omission.
 *
 * All four roles may read: doc05 marks "Dashboard Casa" ✅✅✅✅. WHICH
 * numbers they get is decided by their scope, not by their permission.
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequirePermission('dashboard', 'read')
  @Get('summary')
  @ApiOperation({
    summary: 'Los cuatro indicadores del panel, con su variación contra el período anterior.',
    description:
      'Asistentes y ofrendas del mes, Casas de Paz activas y reuniones de la semana ISO en curso. Cada cifra se limita al alcance del rol.',
  })
  @ApiResponse({ status: 200, description: 'Indicadores.', type: DashboardSummaryDto })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async summary(@CurrentUser() user: JwtPayload): Promise<DashboardSummaryDto> {
    return this.dashboardService.summary(user);
  }

  @RequirePermission('dashboard', 'read')
  @Get('trends')
  @ApiOperation({
    summary: 'Series mensuales de asistencia y ofrendas.',
    description:
      'Ambas series en una sola respuesta, sobre exactamente los mismos meses: dos peticiones podrían devolver ventanas distintas y poner una al lado de la otra dos gráficas que no hablan del mismo período.',
  })
  @ApiResponse({ status: 200, description: 'Series.', type: DashboardTrendsDto })
  async trends(
    @Query() query: DashboardTrendsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DashboardTrendsDto> {
    return this.dashboardService.trends(user, query.months);
  }

  @RequirePermission('dashboard', 'read')
  @Get('map')
  @ApiOperation({
    summary: 'Casas de Paz ubicadas, para el mapa de Colombia.',
    description:
      'Lee únicamente coordenadas ya almacenadas (`pnpm db:geocode:geo`). NUNCA geocodifica en vivo: el proveedor permite una llamada por segundo y bloquea a quien lo excede.',
  })
  @ApiResponse({ status: 200, description: 'Puntos del mapa.', type: MapStatsDto })
  async map(@CurrentUser() user: JwtPayload): Promise<MapStatsDto> {
    return this.dashboardService.mapStats(user);
  }
}
