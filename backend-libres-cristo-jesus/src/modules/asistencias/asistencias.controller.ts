import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { AsistenciasService } from './asistencias.service';
import { AsistenciaCasaPaz } from './asistencia-casa-paz.entity';
import { AsistenciaNuevos } from './asistencia-nuevos.entity';
import { AsistenciaDicipulado } from './asistencia-dicipulado.entity';
import { AsistenciaEvento } from './asistencia-evento.entity';

@Controller('asistencias')
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  // --- Casa de Paz ---
  @Get('casa-paz')
  findAllCasaPaz(): Promise<AsistenciaCasaPaz[]> {
    return this.asistenciasService.findAllCasaPaz();
  }

  @Get('casa-paz/:id')
  findOneCasaPaz(@Param('id') id: string): Promise<AsistenciaCasaPaz | null> {
    return this.asistenciasService.findOneCasaPaz(id);
  }

  @Post('casa-paz')
  createCasaPaz(
    @Body() data: Partial<AsistenciaCasaPaz>,
  ): Promise<AsistenciaCasaPaz> {
    return this.asistenciasService.createCasaPaz(data);
  }

  @Delete('casa-paz/:id')
  removeCasaPaz(@Param('id') id: string): Promise<void> {
    return this.asistenciasService.removeCasaPaz(id);
  }

  // --- Nuevos ---
  @Get('nuevos')
  findAllNuevos(): Promise<AsistenciaNuevos[]> {
    return this.asistenciasService.findAllNuevos();
  }

  @Get('nuevos/:id')
  findOneNuevos(@Param('id') id: string): Promise<AsistenciaNuevos | null> {
    return this.asistenciasService.findOneNuevos(id);
  }

  @Post('nuevos')
  createNuevos(
    @Body() data: Partial<AsistenciaNuevos>,
  ): Promise<AsistenciaNuevos> {
    return this.asistenciasService.createNuevos(data);
  }

  @Delete('nuevos/:id')
  removeNuevos(@Param('id') id: string): Promise<void> {
    return this.asistenciasService.removeNuevos(id);
  }

  // --- Dicipulado ---
  @Get('dicipulado')
  findAllDicipulado(): Promise<AsistenciaDicipulado[]> {
    return this.asistenciasService.findAllDicipulado();
  }

  @Get('dicipulado/:id')
  findOneDicipulado(
    @Param('id') id: string,
  ): Promise<AsistenciaDicipulado | null> {
    return this.asistenciasService.findOneDicipulado(id);
  }

  @Post('dicipulado')
  createDicipulado(
    @Body() data: Partial<AsistenciaDicipulado>,
  ): Promise<AsistenciaDicipulado> {
    return this.asistenciasService.createDicipulado(data);
  }

  @Delete('dicipulado/:id')
  removeDicipulado(@Param('id') id: string): Promise<void> {
    return this.asistenciasService.removeDicipulado(id);
  }

  // --- Eventos ---
  @Get('evento')
  findAllEvento(): Promise<AsistenciaEvento[]> {
    return this.asistenciasService.findAllEvento();
  }

  @Get('evento/por-evento/:eventoId')
  findAllPorEvento(@Param('eventoId') eventoId: string): Promise<AsistenciaEvento[]> {
    return this.asistenciasService.findAllEvento(eventoId);
  }

  @Get('evento/:id')
  findOneEvento(@Param('id') id: string): Promise<AsistenciaEvento | null> {
    return this.asistenciasService.findOneEvento(id);
  }

  @Post('evento')
  createEvento(
    @Body() data: Partial<AsistenciaEvento>,
  ): Promise<AsistenciaEvento> {
    return this.asistenciasService.createEvento(data);
  }

  @Delete('evento/:id')
  removeEvento(@Param('id') id: string): Promise<void> {
    return this.asistenciasService.removeEvento(id);
  }
}
