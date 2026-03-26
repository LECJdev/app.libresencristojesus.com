import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RangoEspiritual } from './rango-espiritual.entity';
import { RangosEspiritualesService } from './rangos-espirituales.service';
import { RangosEspiritualesController } from './rangos-espirituales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RangoEspiritual])],
  controllers: [RangosEspiritualesController],
  providers: [RangosEspiritualesService],
  exports: [RangosEspiritualesService],
})
export class RangosEspiritualesModule {}
