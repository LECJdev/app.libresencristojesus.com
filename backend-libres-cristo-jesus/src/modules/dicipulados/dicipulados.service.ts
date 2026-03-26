import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dicipulado } from './dicipulado.entity';

@Injectable()
export class DicipuladosService {
  constructor(
    @InjectRepository(Dicipulado)
    private readonly dicipuladoRepository: Repository<Dicipulado>,
  ) {}

  findAll(): Promise<Dicipulado[]> {
    return this.dicipuladoRepository.find({
      relations: ['sector', 'distrito', 'personaACargo'],
    });
  }

  findOne(id: string): Promise<Dicipulado | null> {
    return this.dicipuladoRepository.findOne({
      where: { id },
      relations: ['sector', 'distrito', 'personaACargo'],
    });
  }

  create(data: Partial<Dicipulado>): Promise<Dicipulado> {
    const entity = this.dicipuladoRepository.create(data);
    return this.dicipuladoRepository.save(entity);
  }

  async update(
    id: string,
    data: Partial<Dicipulado>,
  ): Promise<Dicipulado | null> {
    await this.dicipuladoRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.dicipuladoRepository.delete(id);
  }
}
