import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiderDicipulado } from './lider-dicipulado.entity';

@Injectable()
export class LideresDicipuladoService {
  constructor(
    @InjectRepository(LiderDicipulado)
    private readonly liderDicipuladoRepository: Repository<LiderDicipulado>,
  ) {}

  findAll(): Promise<LiderDicipulado[]> {
    return this.liderDicipuladoRepository.find({
      relations: ['lider', 'dicipulado'],
    });
  }

  findOne(id: string): Promise<LiderDicipulado | null> {
    return this.liderDicipuladoRepository.findOne({
      where: { id },
      relations: ['lider', 'dicipulado'],
    });
  }

  create(data: Partial<LiderDicipulado>): Promise<LiderDicipulado> {
    const entity = this.liderDicipuladoRepository.create(data);
    return this.liderDicipuladoRepository.save(entity);
  }

  async remove(id: string): Promise<void> {
    await this.liderDicipuladoRepository.delete(id);
  }
}
