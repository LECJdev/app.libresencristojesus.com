import { Module } from '@nestjs/common';
import { KidsChildrenController } from './kids-children.controller';
import { KidsChildrenService } from './kids-children.service';
import { AuditModule } from '../../common/audit/audit.module';

/** `PrismaService` viene del `@Global()` `PrismaModule`, mismo precedente que `KidsSchoolsModule`. */
@Module({
  imports: [AuditModule],
  controllers: [KidsChildrenController],
  providers: [KidsChildrenService],
})
export class KidsChildrenModule {}
