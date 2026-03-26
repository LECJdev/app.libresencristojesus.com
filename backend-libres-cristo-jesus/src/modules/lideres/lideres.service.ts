import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lider } from './lider.entity';

@Injectable()
export class LideresService {
  constructor(
    @InjectRepository(Lider)
    private readonly liderRepository: Repository<Lider>,
  ) {}

  findAll(): Promise<Lider[]> {
    return this.liderRepository.find({
      relations: ['persona', 'distrito', 'rangoEspiritual'],
    });
  }

  findOne(id: string): Promise<Lider | null> {
    return this.liderRepository.findOne({
      where: { id },
      relations: ['persona', 'distrito', 'rangoEspiritual'],
    });
  }

  create(data: Partial<Lider>): Promise<Lider> {
    const entity = this.liderRepository.create(data);
    return this.liderRepository.save(entity);
  }

  async update(id: string, data: Partial<Lider>): Promise<Lider | null> {
    await this.liderRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.liderRepository.delete(id);
  }
}
