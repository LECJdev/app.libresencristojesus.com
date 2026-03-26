import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasaDePaz } from './casa-de-paz.entity';

@Injectable()
export class CasasDePazService {
  constructor(
    @InjectRepository(CasaDePaz)
    private readonly casaDePazRepository: Repository<CasaDePaz>,
  ) {}

  findAll(): Promise<CasaDePaz[]> {
    return this.casaDePazRepository.find({
      relations: ['personaACargo', 'distrito'],
    });
  }

  findOne(id: string): Promise<CasaDePaz | null> {
    return this.casaDePazRepository.findOne({
      where: { id },
      relations: ['personaACargo', 'distrito'],
    });
  }

  create(data: Partial<CasaDePaz>): Promise<CasaDePaz> {
    const entity = this.casaDePazRepository.create(data);
    return this.casaDePazRepository.save(entity);
  }

  async update(
    id: string,
    data: Partial<CasaDePaz>,
  ): Promise<CasaDePaz | null> {
    await this.casaDePazRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.casaDePazRepository.delete(id);
  }
}
