import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasaDePaz } from './casa-de-paz.entity';
import {
  AuthenticatedUser,
  isScopedCasaDePazLeader,
} from '../../common/utils/role.util';
import { sanitizeEntityIdOrThrow } from '../../common/utils/input-security.util';

@Injectable()
export class CasasDePazService {
  constructor(
    @InjectRepository(CasaDePaz)
    private readonly casaDePazRepository: Repository<CasaDePaz>,
  ) {}

  findAll(user: AuthenticatedUser): Promise<CasaDePaz[]> {
    return this.casaDePazRepository.find({
      where: isScopedCasaDePazLeader(user)
        ? {
            idPersonaACargo: user.id,
          }
        : undefined,
      relations: ['personaACargo', 'distrito'],
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<CasaDePaz> {
    const casa = await this.casaDePazRepository.findOne({
      where: this.buildScopedWhere(id, user),
      relations: ['personaACargo', 'distrito'],
    });

    if (!casa) {
      throw new NotFoundException('Casa de paz not found');
    }

    return casa;
  }

  create(
    data: Partial<CasaDePaz>,
    user: AuthenticatedUser,
  ): Promise<CasaDePaz> {
    const entity = this.casaDePazRepository.create(
      isScopedCasaDePazLeader(user)
        ? {
            ...data,
            idPersonaACargo: user.id,
          }
        : data,
    );
    return this.casaDePazRepository.save(entity);
  }

  async update(
    id: string,
    data: Partial<CasaDePaz>,
    user: AuthenticatedUser,
  ): Promise<CasaDePaz> {
    const casa = await this.findOne(id, user);
    const nextData = isScopedCasaDePazLeader(user)
      ? {
          ...data,
          idPersonaACargo: user.id,
        }
      : data;

    Object.assign(casa, nextData);
    await this.casaDePazRepository.save(casa);
    return this.findOne(casa.id, user);
  }

  async remove(id: string): Promise<void> {
    await this.casaDePazRepository.delete(id);
  }

  private buildScopedWhere(id: string, user: AuthenticatedUser) {
    const safeId = sanitizeEntityIdOrThrow(id, 'Casa de paz ID');

    if (!isScopedCasaDePazLeader(user)) {
      return { id: safeId };
    }

    return {
      id: safeId,
      idPersonaACargo: user.id,
    };
  }
}
