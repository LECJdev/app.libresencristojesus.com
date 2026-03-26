import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dicipulado } from './dicipulado.entity';
import { DicipuladosService } from './dicipulados.service';
import { DicipuladosController } from './dicipulados.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Dicipulado])],
  controllers: [DicipuladosController],
  providers: [DicipuladosService],
  exports: [DicipuladosService],
})
export class DicipuladosModule {}
