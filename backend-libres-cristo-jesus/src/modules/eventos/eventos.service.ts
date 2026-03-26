import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evento } from './evento.entity';

@Injectable()
export class EventosService {
  constructor(
    @InjectRepository(Evento)
    private readonly eventoRepository: Repository<Evento>,
  ) {}

  findAll(): Promise<Evento[]> {
    return this.eventoRepository.find();
  }

  async findOne(id: string): Promise<Evento> {
    const evento = await this.eventoRepository.findOneBy({ id });
    if (!evento) {
      throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    return evento;
  }

  create(data: Partial<Evento>): Promise<Evento> {
    const entity = this.eventoRepository.create(data);
    return this.eventoRepository.save(entity);
  }

  async update(id: string, data: Partial<Evento>): Promise<Evento> {
    const evento = await this.findOne(id);
    Object.assign(evento, data);
    return this.eventoRepository.save(evento);
  }

  async remove(id: string): Promise<void> {
    await this.eventoRepository.delete(id);
  }
}
