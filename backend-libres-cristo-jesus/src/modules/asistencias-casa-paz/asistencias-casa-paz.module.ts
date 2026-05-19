import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsistenciaCasaPazQr } from './asistencia-casa-paz-qr.entity';
import { RegistroAsistenciaCasaPazQr } from './registro-asistencia-casa-paz-qr.entity';
import { AsistenciasCasaPazController } from './asistencias-casa-paz.controller';
import { AsistenciasCasaPazService } from './asistencias-casa-paz.service';
import { Red } from '../redes/red.entity';
import { Persona } from '../personas/persona.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsistenciaCasaPazQr,
      RegistroAsistenciaCasaPazQr,
      Red,
      Persona,
    ]),
  ],
  controllers: [AsistenciasCasaPazController],
  providers: [AsistenciasCasaPazService],
  exports: [AsistenciasCasaPazService],
})
export class AsistenciasCasaPazModule {}
