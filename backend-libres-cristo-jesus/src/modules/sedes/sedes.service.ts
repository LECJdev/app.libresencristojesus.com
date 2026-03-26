import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './sede.entity';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private readonly sedeRepository: Repository<Sede>,
  ) {}

  findAll(): Promise<Sede[]> {
    return this.sedeRepository.find();
  }

  findOne(id: string): Promise<Sede | null> {
    return this.sedeRepository.findOneBy({ id });
  }

  create(data: Partial<Sede>): Promise<Sede> {
    const entity = this.sedeRepository.create(data);
    return this.sedeRepository.save(entity);
  }

  async update(id: string, data: Partial<Sede>): Promise<Sede | null> {
    await this.sedeRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.sedeRepository.delete(id);
  }
}
