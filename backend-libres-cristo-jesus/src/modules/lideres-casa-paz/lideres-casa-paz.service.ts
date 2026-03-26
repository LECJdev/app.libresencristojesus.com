import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiderCasaDePaz } from './lider-casa-paz.entity';

@Injectable()
export class LideresCasaPazService {
  constructor(
    @InjectRepository(LiderCasaDePaz)
    private readonly liderCasaPazRepository: Repository<LiderCasaDePaz>,
  ) {}

  findAll(): Promise<LiderCasaDePaz[]> {
    return this.liderCasaPazRepository.find({
      relations: ['lider', 'casaDePaz'],
    });
  }

  findOne(id: string): Promise<LiderCasaDePaz | null> {
    return this.liderCasaPazRepository.findOne({
      where: { id },
      relations: ['lider', 'casaDePaz'],
    });
  }

  create(data: Partial<LiderCasaDePaz>): Promise<LiderCasaDePaz> {
    const entity = this.liderCasaPazRepository.create(data);
    return this.liderCasaPazRepository.save(entity);
  }

  async remove(id: string): Promise<void> {
    await this.liderCasaPazRepository.delete(id);
  }
}
