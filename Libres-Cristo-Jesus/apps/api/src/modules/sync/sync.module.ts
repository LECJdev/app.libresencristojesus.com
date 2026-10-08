import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { PeopleModule } from '../people/people.module';

/**
 * Sincronización offline (Fase 10).
 *
 * IMPORTA LOS MÓDULOS DE DOMINIO en lugar de hablar con Prisma por su
 * cuenta. Ese import es la Regla 9 hecha estructura: `SyncService` no puede
 * reimplementar una regla de asistencia aunque quisiera, porque no tiene otra
 * forma de aplicarla que llamando a `AttendanceService`.
 *
 * Su único aporte propio es el CUÁNDO — pasar `createdOfflineAt` como el
 * `now` de cada servicio — y la bitácora de idempotencia.
 */
@Module({
  imports: [AttendanceModule, MeetingsModule, PeopleModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
