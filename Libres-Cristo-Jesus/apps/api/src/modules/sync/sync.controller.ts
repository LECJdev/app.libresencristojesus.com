import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncBatchDto, SyncBatchResultDto } from './dto/sync.dto';
import { RequirePermission } from '../../common/security/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';

/**
 * Sincronización de operaciones creadas sin conexión (RN-1202/RN-1203).
 *
 * ── Por qué no lleva `scopeType` ─────────────────────────────────────
 * Un lote abarca varias reuniones y hasta operaciones sin reunión, así que
 * `ScopeGuard` no tiene un id único que resolver. EL ALCANCE NO SE PIERDE:
 * cada operación se aplica llamando al servicio de dominio correspondiente,
 * que ya valida permisos y alcance por fila exactamente igual que cuando la
 * petición llega en línea. Sincronizar no es una vía alterna al control de
 * acceso; es la misma puerta con otra fecha.
 *
 * ── Siempre 200, incluso con rechazos ────────────────────────────────
 * El lote se procesa completo y cada operación reporta su propio resultado.
 * Un 4xx global obligaría al cliente a adivinar cuáles se aplicaron y cuáles
 * no, y lo empujaría a reenviar todo — que es justo lo que la idempotencia
 * está para evitar. Una operación rechazada es un resultado del proceso, no
 * un fallo del proceso.
 */
@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @RequirePermission('sync', 'push')
  @HttpCode(HttpStatus.OK)
  @Post('operations')
  @ApiOperation({
    summary: 'Sincroniza un lote de operaciones realizadas sin conexión.',
    description:
      'Se procesan en orden cronológico por `createdOfflineAt`, que es también la fecha contra la que se evalúa el bloqueo semanal — nunca la de llegada. Idempotente por `operationId`: reenviar la cola no duplica nada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado por operación.',
    type: SyncBatchResultDto,
  })
  @ApiResponse({ status: 400, description: 'Lote vacío, demasiado grande o mal formado.' })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  @ApiResponse({ status: 403, description: 'Permiso insuficiente.' })
  async push(
    @Body() batch: SyncBatchDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SyncBatchResultDto> {
    return this.syncService.processBatch(batch, user);
  }
}
