import { Module } from '@nestjs/common';
import { KidsSchoolsController } from './kids-schools.controller';
import { KidsSchoolsService } from './kids-schools.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * `PrismaService` no se importa acá: viene del `@Global()` `PrismaModule`
 * (ya importado en `AppModule`), mismo precedente que `PeaceHousesModule`.
 * `AuditModule` sí se importa porque `KidsSchoolsController` usa su
 * `AuditInterceptor` en create/update/assignments.
 */
@Module({
  imports: [AuditModule],
  controllers: [KidsSchoolsController],
  providers: [KidsSchoolsService],
})
export class KidsSchoolsModule {}
