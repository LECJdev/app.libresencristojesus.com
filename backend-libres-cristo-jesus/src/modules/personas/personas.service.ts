import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Persona } from './persona.entity';
import { Rol } from '../../common/enums/rol.enum';
import * as bcrypt from 'bcrypt';
import {
  sanitizeCelularOrThrow,
  sanitizeDocumentoOrThrow,
  sanitizeEntityIdOrThrow,
  sanitizeNombreOrThrow,
  sanitizeOptionalEmail,
  sanitizeOptionalText,
} from '../../common/utils/input-security.util';
import { Red } from '../redes/red.entity';

export class CreateUserDto {
  nombres: string;
  apellidos: string;
  celular: string;
  documento?: string;
  rol: Rol;
  password?: string;
}

export class PromotePersonalAdministrativoDto {
  personaId: string;
}

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,

    @InjectRepository(Red)
    private readonly redRepository: Repository<Red>,
  ) {}

  findAll(): Promise<Persona[]> {
    return this.personaRepository.find({ relations: ['red', 'red.sede', 'invitadoPor'] });
  }

  findOne(id: string): Promise<Persona | null> {
    return this.personaRepository.findOne({
      where: { id },
      relations: ['red', 'red.sede', 'invitadoPor'],
    });
  }

  async create(data: Partial<Persona>): Promise<Persona> {
    const { red: _ignoredRed, ...restData } = data;
    const idRed = await this.normalizeRedId(this.extractRequestedRedId(data));

    const entity = this.personaRepository.create({
      ...restData,
      nombres: data.nombres
        ? sanitizeNombreOrThrow(data.nombres, 'Nombres')
        : null,
      apellidos: data.apellidos
        ? sanitizeNombreOrThrow(data.apellidos, 'Apellidos')
        : null,
      celular: data.celular ? sanitizeCelularOrThrow(data.celular) : null,
      direccion: sanitizeOptionalText(data.direccion ?? undefined, 255),
      correo: sanitizeOptionalEmail(data.correo ?? undefined),
      barrio: sanitizeOptionalText(data.barrio ?? undefined, 150),
      departamento: sanitizeOptionalText(data.departamento ?? undefined, 150),
      ciudad: sanitizeOptionalText(data.ciudad ?? undefined, 150),
      idRed,
    });

    const saved = await this.personaRepository.save(entity);
    return this.findOneOrThrow(saved.id);
  }

  async update(id: string, data: Partial<Persona>): Promise<Persona | null> {
    const existing = await this.findOne(id);
    if (!existing) return null;

    const { red: _ignoredRed, ...restData } = data;
    const idRed = await this.normalizeRedId(
      this.extractRequestedRedId(data),
      existing.idRed,
    );

    const personaToUpdate = await this.personaRepository.preload({
      id,
      ...restData,
      nombres:
        data.nombres !== undefined
          ? sanitizeOptionalText(data.nombres ?? undefined, 150)
          : existing.nombres,
      apellidos:
        data.apellidos !== undefined
          ? sanitizeOptionalText(data.apellidos ?? undefined, 150)
          : existing.apellidos,
      celular:
        data.celular !== undefined
          ? data.celular
            ? sanitizeCelularOrThrow(data.celular)
            : null
          : existing.celular,
      direccion:
        data.direccion !== undefined
          ? sanitizeOptionalText(data.direccion ?? undefined, 255)
          : existing.direccion,
      correo:
        data.correo !== undefined
          ? sanitizeOptionalEmail(data.correo ?? undefined)
          : existing.correo,
      barrio:
        data.barrio !== undefined
          ? sanitizeOptionalText(data.barrio ?? undefined, 150)
          : existing.barrio,
      departamento:
        data.departamento !== undefined
          ? sanitizeOptionalText(data.departamento ?? undefined, 150)
          : existing.departamento,
      ciudad:
        data.ciudad !== undefined
          ? sanitizeOptionalText(data.ciudad ?? undefined, 150)
          : existing.ciudad,
      idRed,
    });
    if (!personaToUpdate) return null;
    await this.personaRepository.save(personaToUpdate);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.personaRepository.delete(id);
  }

  findByCelular(celular: string): Promise<Persona | null> {
    return this.personaRepository.findOne({
      where: { celular },
      relations: ['red', 'red.sede', 'invitadoPor'],
    });
  }

  findByCorreo(correo: string): Promise<Persona | null> {
    return this.personaRepository.findOne({
      where: { correo },
      relations: ['red', 'red.sede', 'invitadoPor'],
    });
  }

  async createUser(dto: CreateUserDto): Promise<Omit<Persona, 'password'>> {
    const existing = await this.findByCelular(dto.celular);
    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese celular');
    }

    const needsPassword = dto.rol === Rol.ADMIN || dto.rol === Rol.SUPER_ADMIN;
    if (needsPassword && !dto.password) {
      throw new BadRequestException(
        'Los roles ADMIN y SUPER_ADMIN requieren contraseña',
      );
    }

    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const entity = this.personaRepository.create({
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      celular: dto.celular,
      documento: dto.documento ?? null,
      rol: dto.rol,
      password: hashedPassword ?? null,
    });

    const saved = await this.personaRepository.save(entity);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = saved;
    return result as Omit<Persona, 'password'>;
  }

  async promoteToPersonalAdministrativo(
    dto: PromotePersonalAdministrativoDto,
  ): Promise<Omit<Persona, 'password'>> {
    const personaId = sanitizeEntityIdOrThrow(dto.personaId, 'ID de persona');
    const persona = await this.findOneOrThrow(personaId);

    if (persona.rol !== Rol.INTEGRANTE) {
      throw new BadRequestException(
        'Solo se pueden promover personas registradas con rol INTEGRANTE',
      );
    }

    if (!persona.documento) {
      throw new BadRequestException(
        'La persona debe tener documento registrado para asignar la contraseña inicial',
      );
    }

    if (!persona.correo) {
      throw new BadRequestException(
        'La persona debe tener correo registrado para habilitar el acceso administrativo',
      );
    }

    const documento = sanitizeDocumentoOrThrow(persona.documento);
    const correo = sanitizeOptionalEmail(persona.correo);

    if (!correo) {
      throw new BadRequestException(
        'La persona debe tener un correo válido para habilitar el acceso administrativo',
      );
    }

    const hashedPassword = await bcrypt.hash(documento, 10);

    await this.personaRepository.update(persona.id, {
      rol: Rol.PERSONAL_ADMINISTRATIVO,
      password: hashedPassword,
      documento,
      correo,
    });

    const updated = await this.findOneOrThrow(persona.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = updated;
    return result as Omit<Persona, 'password'>;
  }

  private async normalizeRedId(
    idRed?: string | null,
    fallback?: string | null,
  ): Promise<string | null> {
    if (idRed === undefined) {
      return fallback ?? null;
    }

    if (idRed === null || idRed === '') {
      return null;
    }

    const safeId = sanitizeEntityIdOrThrow(idRed, 'ID de red');
    const red = await this.redRepository.findOneBy({ id: safeId });

    if (!red) {
      throw new NotFoundException('La red seleccionada no existe');
    }

    return safeId;
  }

  private extractRequestedRedId(data: Partial<Persona>): string | null | undefined {
    if (data.idRed !== undefined) {
      return data.idRed;
    }

    if (data.red === null) {
      return null;
    }

    return data.red?.id;
  }

  private async findOneOrThrow(id: string): Promise<Persona> {
    const persona = await this.findOne(id);

    if (!persona) {
      throw new NotFoundException('Persona no encontrada');
    }

    return persona;
  }
}
