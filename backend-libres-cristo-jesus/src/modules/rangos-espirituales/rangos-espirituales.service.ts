import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RangoEspiritual } from './rango-espiritual.entity';

@Injectable()
export class RangosEspiritualesService {
  constructor(
    @InjectRepository(RangoEspiritual)
    private readonly rangoEspiritualRepository: Repository<RangoEspiritual>,
  ) {}

  findAll(): Promise<RangoEspiritual[]> {
    return this.rangoEspiritualRepository.find();
  }

  findOne(id: string): Promise<RangoEspiritual | null> {
    return this.rangoEspiritualRepository.findOneBy({ id });
  }

  create(data: Partial<RangoEspiritual>): Promise<RangoEspiritual> {
    const entity = this.rangoEspiritualRepository.create(data);
    return this.rangoEspiritualRepository.save(entity);
  }

  async update(
    id: string,
    data: Partial<RangoEspiritual>,
  ): Promise<RangoEspiritual | null> {
    await this.rangoEspiritualRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.rangoEspiritualRepository.delete(id);
  }
}
