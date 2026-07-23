import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Red } from './red.entity';
import { Sede } from '../sedes/sede.entity';
import {
  sanitizeEntityIdOrThrow,
  sanitizeOptionalText,
  sanitizeRequiredTextOrThrow,
} from '../../common/utils/input-security.util';

@Injectable()
export class RedesService {
  constructor(
    @InjectRepository(Red)
    private readonly redRepository: Repository<Red>,

    @InjectRepository(Sede)
    private readonly sedeRepository: Repository<Sede>,
  ) {}

  findAll(): Promise<Red[]> {
    return this.redRepository.find({ relations: ['sede'] });
  }

  findOne(id: string): Promise<Red | null> {
    return this.redRepository.findOne({ where: { id }, relations: ['sede'] });
  }

  async create(data: Partial<Red>): Promise<Red> {
    const entity = await this.buildEntity(data);
    const saved = await this.redRepository.save(
      this.redRepository.create(entity),
    );
    return this.findOneOrThrow(saved.id);
  }

  async update(id: string, data: Partial<Red>): Promise<Red | null> {
    const existing = await this.findOne(id);
    if (!existing) {
      return null;
    }

    const entity = await this.buildEntity(data, existing);
    await this.redRepository.save(
      this.redRepository.create({
        ...existing,
        ...entity,
        id,
      }),
    );

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.redRepository.delete(id);
  }

  private async buildEntity(
    data: Partial<Red>,
    fallback?: Red,
  ): Promise<Partial<Red>> {
    const requestedSedeId =
      data.idSede ??
      (data.sede === null ? null : data.sede?.id) ??
      fallback?.idSede;

    if (!requestedSedeId) {
      throw new BadRequestException('Debes seleccionar una sede para la red');
    }

    const idSede = sanitizeEntityIdOrThrow(requestedSedeId, 'ID de sede');
    const sede = await this.sedeRepository.findOneBy({ id: idSede });

    if (!sede) {
      throw new NotFoundException('La sede seleccionada no existe');
    }

    return {
      nombre:
        data.nombre !== undefined
          ? sanitizeRequiredTextOrThrow(
              data.nombre ?? '',
              'Nombre de la red',
              150,
            )
          : (fallback?.nombre ?? null),
      detalles:
        data.detalles !== undefined
          ? sanitizeOptionalText(data.detalles ?? undefined, 1000)
          : (fallback?.detalles ?? null),
      idSede,
    };
  }

  private async findOneOrThrow(id: string): Promise<Red> {
    const red = await this.findOne(id);

    if (!red) {
      throw new NotFoundException('Red no encontrada');
    }

    return red;
  }
}
