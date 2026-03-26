import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Distrito } from './distrito.entity';

@Injectable()
export class DistritosService {
  constructor(
    @InjectRepository(Distrito)
    private readonly distritoRepository: Repository<Distrito>,
  ) {}

  findAll(): Promise<Distrito[]> {
    return this.distritoRepository.find({ relations: ['sector', 'sede'] });
  }

  findOne(id: string): Promise<Distrito | null> {
    return this.distritoRepository.findOne({
      where: { id },
      relations: ['sector', 'sede'],
    });
  }

  create(data: Partial<Distrito>): Promise<Distrito> {
    const entity = this.distritoRepository.create(data);
    return this.distritoRepository.save(entity);
  }

  async update(id: string, data: Partial<Distrito>): Promise<Distrito | null> {
    await this.distritoRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.distritoRepository.delete(id);
  }
}
