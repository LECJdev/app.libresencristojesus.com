import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * File upload/download. `StorageService` arrives from the `@Global()`
 * `StorageModule`; `AuditModule` must be imported explicitly because it is
 * NOT global and `FilesController` applies `AuditInterceptor` — omitting it
 * passes every static check and then refuses to boot (the failure mode
 * `SettingsModule` already taught us).
 */
@Module({
  imports: [AuditModule],
  controllers: [FilesController],
})
export class FilesModule {}
