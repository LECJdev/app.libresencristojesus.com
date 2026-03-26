import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsistenciaCasaPaz } from './asistencia-casa-paz.entity';
import { AsistenciaNuevos } from './asistencia-nuevos.entity';
import { AsistenciaDicipulado } from './asistencia-dicipulado.entity';
import { AsistenciaEvento } from './asistencia-evento.entity';

@Injectable()
export class AsistenciasService {
  constructor(
    @InjectRepository(AsistenciaCasaPaz)
    private readonly asistCasaPazRepo: Repository<AsistenciaCasaPaz>,

    @InjectRepository(AsistenciaNuevos)
    private readonly asistNuevosRepo: Repository<AsistenciaNuevos>,

    @InjectRepository(AsistenciaDicipulado)
    private readonly asistDicipuladoRepo: Repository<AsistenciaDicipulado>,

    @InjectRepository(AsistenciaEvento)
    private readonly asistEventoRepo: Repository<AsistenciaEvento>,
  ) {}

  // --- Asistencia Casa de Paz ---
  findAllCasaPaz(): Promise<AsistenciaCasaPaz[]> {
    return this.asistCasaPazRepo.find({ relations: ['casaDePaz', 'persona'] });
  }

  findOneCasaPaz(id: string): Promise<AsistenciaCasaPaz | null> {
    return this.asistCasaPazRepo.findOne({
      where: { id },
      relations: ['casaDePaz', 'persona'],
    });
  }

  createCasaPaz(data: Partial<AsistenciaCasaPaz>): Promise<AsistenciaCasaPaz> {
    const entity = this.asistCasaPazRepo.create(data);
    return this.asistCasaPazRepo.save(entity);
  }

  async removeCasaPaz(id: string): Promise<void> {
    await this.asistCasaPazRepo.delete(id);
  }

  // --- Asistencia Nuevos ---
  findAllNuevos(): Promise<AsistenciaNuevos[]> {
    return this.asistNuevosRepo.find({
      relations: ['sede', 'persona', 'personaQuienInvito'],
    });
  }

  findOneNuevos(id: string): Promise<AsistenciaNuevos | null> {
    return this.asistNuevosRepo.findOne({
      where: { id },
      relations: ['sede', 'persona', 'personaQuienInvito'],
    });
  }

  createNuevos(data: Partial<AsistenciaNuevos>): Promise<AsistenciaNuevos> {
    const entity = this.asistNuevosRepo.create(data);
    return this.asistNuevosRepo.save(entity);
  }

  async removeNuevos(id: string): Promise<void> {
    await this.asistNuevosRepo.delete(id);
  }

  // --- Asistencia Dicipulado ---
  findAllDicipulado(): Promise<AsistenciaDicipulado[]> {
    return this.asistDicipuladoRepo.find({
      relations: ['dicipulado', 'persona'],
    });
  }

  findOneDicipulado(id: string): Promise<AsistenciaDicipulado | null> {
    return this.asistDicipuladoRepo.findOne({
      where: { id },
      relations: ['dicipulado', 'persona'],
    });
  }

  createDicipulado(
    data: Partial<AsistenciaDicipulado>,
  ): Promise<AsistenciaDicipulado> {
    const entity = this.asistDicipuladoRepo.create(data);
    return this.asistDicipuladoRepo.save(entity);
  }

  async removeDicipulado(id: string): Promise<void> {
    await this.asistDicipuladoRepo.delete(id);
  }

  // --- Asistencia Evento ---
  findAllEvento(eventoId?: string): Promise<AsistenciaEvento[]> {
    if (eventoId) {
      return this.asistEventoRepo.find({
        where: { evento: { id: eventoId } },
        relations: ['evento', 'persona'],
      });
    }
    return this.asistEventoRepo.find({
      relations: ['evento', 'persona'],
    });
  }

  findOneEvento(id: string): Promise<AsistenciaEvento | null> {
    return this.asistEventoRepo.findOne({
      where: { id },
      relations: ['evento', 'persona'],
    });
  }

  createEvento(data: Partial<AsistenciaEvento>): Promise<AsistenciaEvento> {
    const entity = this.asistEventoRepo.create(data);
    return this.asistEventoRepo.save(entity);
  }

  async removeEvento(id: string): Promise<void> {
    await this.asistEventoRepo.delete(id);
  }
}
