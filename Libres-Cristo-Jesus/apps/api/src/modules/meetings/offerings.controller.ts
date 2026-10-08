import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { PaginationMeta } from '@lcj/types';
import { OfferingsService } from './offerings.service';
import {
  ListOfferingsQueryDto,
  OfferingHistoryRowDto,
  OfferingSummaryDto,
} from './dto/list-offerings-query.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Historial y estadísticas de ofrendas (doc19 `/offerings`).
 *
 * READS LIVE HERE, WRITES LIVE UNDER `/meetings/:id/offering`.
 * Registering an offering belongs to the meeting that produced it — that
 * is where the weekly lock applies. Reading crosses meetings, houses and
 * months, so it gets its own collection endpoint.
 *
 * NO `scopeType`: a list has no single resource id for `ScopeGuard` to
 * resolve. `OfferingsService` narrows the `where` clause instead, so a
 * Líder finds exactly the offerings they may open.
 */
@ApiTags('offerings')
@ApiBearerAuth()
@Controller('offerings')
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @RequirePermission('offering', 'read')
  @Get()
  @ApiOperation({
    summary: 'Historial de ofrendas, filtrable por Casa de Paz, distrito y rango de fechas.',
    description: 'Cada rol ve únicamente las ofrendas dentro de su alcance.',
  })
  @ApiResponse({ status: 200, description: 'Ofrendas.', type: [OfferingHistoryRowDto] })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async findAll(
    @Query() query: ListOfferingsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: OfferingHistoryRowDto[]; meta: PaginationMeta }> {
    return this.offeringsService.findAll(query, user);
  }

  @RequirePermission('offering', 'read')
  @Get('summary')
  @ApiOperation({
    summary: 'Total, promedio, mínimo, máximo y desglose por semana ISO.',
    description:
      'Agregado en base de datos sobre TODO el filtro, no sobre la página en pantalla. El promedio es por ofrenda registrada: una semana sin reportar es un dato ausente, no un cero.',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas.', type: OfferingSummaryDto })
  async summary(
    @Query() query: ListOfferingsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OfferingSummaryDto> {
    return this.offeringsService.summary(query, user);
  }
}
