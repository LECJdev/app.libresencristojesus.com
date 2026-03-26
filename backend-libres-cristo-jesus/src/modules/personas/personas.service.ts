import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Persona } from './persona.entity';
import { Rol } from '../../common/enums/rol.enum';
import * as bcrypt from 'bcrypt';

export class CreateUserDto {
  nombres: string;
  apellidos: string;
  celular: string;
  rol: Rol;
  password?: string;
}

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,
  ) {}

  findAll(): Promise<Persona[]> {
    return this.personaRepository.find();
  }

  findOne(id: string): Promise<Persona | null> {
    return this.personaRepository.findOneBy({ id });
  }

  create(data: Partial<Persona>): Promise<Persona> {
    const entity = this.personaRepository.create(data);
    return this.personaRepository.save(entity);
  }

  async update(id: string, data: Partial<Persona>): Promise<Persona | null> {
    await this.personaRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.personaRepository.delete(id);
  }

  findByCelular(celular: string): Promise<Persona | null> {
    return this.personaRepository.findOneBy({ celular });
  }

  async createUser(dto: CreateUserDto): Promise<Omit<Persona, 'password'>> {
    const existing = await this.findByCelular(dto.celular);
    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese celular');
    }

    const needsPassword = dto.rol === Rol.ADMIN || dto.rol === Rol.SUPER_ADMIN;
    if (needsPassword && !dto.password) {
      throw new BadRequestException('Los roles ADMIN y SUPER_ADMIN requieren contraseña');
    }

    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const entity = this.personaRepository.create({
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      celular: dto.celular,
      rol: dto.rol,
      password: hashedPassword ?? null,
    });

    const saved = await this.personaRepository.save(entity);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = saved;
    return result as Omit<Persona, 'password'>;
  }
}
