import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiderDicipulado } from './lider-dicipulado.entity';
import { LideresDicipuladoService } from './lideres-dicipulado.service';
import { LideresDicipuladoController } from './lideres-dicipulado.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LiderDicipulado])],
  controllers: [LideresDicipuladoController],
  providers: [LideresDicipuladoService],
  exports: [LideresDicipuladoService],
})
export class LideresDicipuladoModule {}
