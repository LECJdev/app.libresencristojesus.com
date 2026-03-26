import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Red } from './red.entity';
import { RedesService } from './redes.service';
import { RedesController } from './redes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Red])],
  controllers: [RedesController],
  providers: [RedesService],
  exports: [RedesService],
})
export class RedesModule {}
