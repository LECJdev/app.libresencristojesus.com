import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsistenciaCasaPaz } from './asistencia-casa-paz.entity';
import { AsistenciaNuevos } from './asistencia-nuevos.entity';
import { AsistenciaDicipulado } from './asistencia-dicipulado.entity';
import { AsistenciaEvento } from './asistencia-evento.entity';
import { AsistenciasService } from './asistencias.service';
import { AsistenciasController } from './asistencias.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsistenciaCasaPaz,
      AsistenciaNuevos,
      AsistenciaDicipulado,
      AsistenciaEvento,
    ]),
  ],
  controllers: [AsistenciasController],
  providers: [AsistenciasService],
  exports: [AsistenciasService],
})
export class AsistenciasModule {}
