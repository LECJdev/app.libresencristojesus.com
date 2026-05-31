import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsistenciaDominical } from './asistencia-dominical.entity';
import { RegistroAsistenciaDominical } from './registro-asistencia-dominical.entity';
import { AsistenciasDominicalesController } from './asistencias-dominicales.controller';
import { AsistenciasDominicalesService } from './asistencias-dominicales.service';
import { Sede } from '../sedes/sede.entity';
import { Red } from '../redes/red.entity';
import { Persona } from '../personas/persona.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsistenciaDominical,
      RegistroAsistenciaDominical,
      Sede,
      Red,
      Persona,
    ]),
  ],
  controllers: [AsistenciasDominicalesController],
  providers: [AsistenciasDominicalesService],
  exports: [AsistenciasDominicalesService],
})
export class AsistenciasDominicalesModule {}
