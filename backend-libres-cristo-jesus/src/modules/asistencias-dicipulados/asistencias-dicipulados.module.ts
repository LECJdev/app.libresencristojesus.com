import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsistenciaDicipuladoQr } from './asistencia-dicipulado-qr.entity';
import { RegistroAsistenciaDicipuladoQr } from './registro-asistencia-dicipulado-qr.entity';
import { AsistenciasDicipuladosController } from './asistencias-dicipulados.controller';
import { AsistenciasDicipuladosService } from './asistencias-dicipulados.service';
import { Sede } from '../sedes/sede.entity';
import { Red } from '../redes/red.entity';
import { Persona } from '../personas/persona.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsistenciaDicipuladoQr,
      RegistroAsistenciaDicipuladoQr,
      Sede,
      Red,
      Persona,
    ]),
  ],
  controllers: [AsistenciasDicipuladosController],
  providers: [AsistenciasDicipuladosService],
  exports: [AsistenciasDicipuladosService],
})
export class AsistenciasDicipuladosModule {}
