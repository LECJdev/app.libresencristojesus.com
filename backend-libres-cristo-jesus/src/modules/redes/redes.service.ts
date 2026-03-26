import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Red } from './red.entity';

@Injectable()
export class RedesService {
  constructor(
    @InjectRepository(Red)
    private readonly redRepository: Repository<Red>,
  ) {}

  findAll(): Promise<Red[]> {
    return this.redRepository.find();
  }

  findOne(id: string): Promise<Red | null> {
    return this.redRepository.findOneBy({ id });
  }

  create(data: Partial<Red>): Promise<Red> {
    const entity = this.redRepository.create(data);
    return this.redRepository.save(entity);
  }

  async update(id: string, data: Partial<Red>): Promise<Red | null> {
    await this.redRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.redRepository.delete(id);
  }
}
