import { Module } from '@nestjs/common';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * Personas (doc04 §5).
 *
 * `AuditModule` imported explicitly — it is NOT global, and omitting it
 * passes every static check and then refuses to boot.
 */
@Module({
  imports: [AuditModule],
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
