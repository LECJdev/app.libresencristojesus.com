import { Module } from '@nestjs/common';
import { SermonThemesController } from './sermon-themes.controller';
import { SermonThemesService } from './sermon-themes.service';
import { AuditModule } from '../../common/audit/audit.module';

/**
 * Catálogo de temas de predicación (doc04 §6 `SermonTheme`).
 *
 * Its own module rather than a corner of `MeetingsModule`: the catalog has
 * its own lifecycle, its own permissions and its own screen. Folding it in
 * would make the meetings module the owner of something no meeting owns.
 *
 * `AuditModule` imported explicitly — not global.
 */
@Module({
  imports: [AuditModule],
  controllers: [SermonThemesController],
  providers: [SermonThemesService],
  exports: [SermonThemesService],
})
export class SermonThemesModule {}
