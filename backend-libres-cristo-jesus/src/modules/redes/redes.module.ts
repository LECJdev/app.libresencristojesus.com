import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Red } from './red.entity';
import { RedesService } from './redes.service';
import { RedesController } from './redes.controller';
import { Sede } from '../sedes/sede.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Red, Sede])],
  controllers: [RedesController],
  providers: [RedesService],
  exports: [RedesService],
})
export class RedesModule {}
