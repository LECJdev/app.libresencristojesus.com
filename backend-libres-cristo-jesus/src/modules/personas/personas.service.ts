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
import { getPrimaryRole, normalizeRoles } from '../../common/utils/role.util';

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

export class AssignCasaDePazLeaderDto {
  personaId: string;
}

export interface PersonaExportRowDto {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  edad: number | null;
  celular: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  genero: string | null;
  direccion: string | null;
  correo: string | null;
  encuentro: boolean | null;
  barrio: string | null;
  departamento: string | null;
  ciudad: string | null;
  fechaNacimiento: string | null;
  idRed: string | null;
  redNombre: string | null;
  invitadoPorId: string | null;
  invitadoPorNombre: string | null;
  fechaCreacion: Date | string | null;
  fechaModificacion: Date | string | null;
}

export interface PersonaCensoRowDto {
  nombres: string | null;
  apellidos: string | null;
  documento: string | null;
  celular: string | null;
  fechaNacimiento: string | null;
  correo: string | null;
  encuentro: boolean | null;
}

export interface PersonaCensoResponseDto {
  redId: string;
  redNombre: string;
  rows: PersonaCensoRowDto[];
}

export interface PersonaReadDto {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  edad: number | null;
  celular: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  genero: string | null;
  direccion: string | null;
  correo: string | null;
  encuentro: boolean | null;
  rol: Rol;
  roles: Rol[];
  barrio: string | null;
  departamento: string | null;
  ciudad: string | null;
  fechaNacimiento: string | null;
  idRed: string | null;
  red: {
    id: string;
    nombre: string | null;
    detalles: string | null;
    idSede: string | null;
    sede: {
      id: string;
      nombre: string | null;
      direccion: string | null;
    } | null;
  } | null;
  invitadoPor: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
  } | null;
  fechaCreacion: Date | string | null;
  fechaModificacion: Date | string | null;
}

interface PersonaReadRow {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  edad: number | null;
  celular: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  genero: string | null;
  direccion: string | null;
  correo: string | null;
  encuentro: boolean | null;
  rol: Rol | null;
  roles: Rol[] | null;
  barrio: string | null;
  departamento: string | null;
  ciudad: string | null;
  fechaNacimiento: string | null;
  idRed: string | null;
  redId: string | null;
  redNombre: string | null;
  redDetalles: string | null;
  redIdSede: string | null;
  sedeId: string | null;
  sedeNombre: string | null;
  sedeDireccion: string | null;
  invitadoPorId: string | null;
  invitadoPorNombres: string | null;
  invitadoPorApellidos: string | null;
  fechaCreacion: Date | string | null;
  fechaModificacion: Date | string | null;
}

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,

    @InjectRepository(Red)
    private readonly redRepository: Repository<Red>,
  ) {}

  async findAll(): Promise<PersonaReadDto[]> {
    const rows = await this.createPersonaReadQuery()
      .orderBy('persona.apellidos', 'ASC')
      .addOrderBy('persona.nombres', 'ASC')
      .addOrderBy('persona.id', 'ASC')
      .getRawMany<PersonaReadRow>();

    return rows.map((row) => this.mapPersonaReadRow(row));
  }

  async findExportRows(): Promise<PersonaExportRowDto[]> {
    const rawRows = await this.personaRepository
      .createQueryBuilder('persona')
      .leftJoin('persona.red', 'red')
      .leftJoin('persona.invitadoPor', 'invitador')
      .select('persona.id', 'id')
      .addSelect('persona.nombres', 'nombres')
      .addSelect('persona.apellidos', 'apellidos')
      .addSelect('persona.edad', 'edad')
      .addSelect('persona.celular', 'celular')
      .addSelect('persona.tipoDocumento', 'tipoDocumento')
      .addSelect('persona.documento', 'documento')
      .addSelect('persona.genero', 'genero')
      .addSelect('persona.direccion', 'direccion')
      .addSelect('persona.correo', 'correo')
      .addSelect('persona.encuentro', 'encuentro')
      .addSelect('persona.barrio', 'barrio')
      .addSelect('persona.departamento', 'departamento')
      .addSelect('persona.ciudad', 'ciudad')
      .addSelect('persona.fechaNacimiento', 'fechaNacimiento')
      .addSelect('persona.idRed', 'idRed')
      .addSelect('red.nombre', 'redNombre')
      .addSelect('invitador.id', 'invitadoPorId')
      .addSelect(
        `NULLIF(TRIM(CONCAT_WS(' ', invitador.nombres, invitador.apellidos)), '')`,
        'invitadoPorNombre',
      )
      .addSelect('persona.fechaCreacion', 'fechaCreacion')
      .addSelect('persona.fechaModificacion', 'fechaModificacion')
      .orderBy('persona.apellidos', 'ASC')
      .addOrderBy('persona.nombres', 'ASC')
      .addOrderBy('persona.id', 'ASC')
      .getRawMany<PersonaExportRowDto>();

    return rawRows.map((row) => ({
      id: row.id,
      nombres: row.nombres,
      apellidos: row.apellidos,
      edad: row.edad,
      celular: row.celular,
      tipoDocumento: row.tipoDocumento,
      documento: row.documento,
      genero: row.genero,
      direccion: row.direccion,
      correo: row.correo,
      encuentro: row.encuentro,
      barrio: row.barrio,
      departamento: row.departamento,
      ciudad: row.ciudad,
      fechaNacimiento: row.fechaNacimiento,
      idRed: row.idRed,
      redNombre: row.redNombre,
      invitadoPorId: row.invitadoPorId,
      invitadoPorNombre: row.invitadoPorNombre,
      fechaCreacion: row.fechaCreacion,
      fechaModificacion: row.fechaModificacion,
    }));
  }

  async findCensoRows(redId?: string): Promise<PersonaCensoResponseDto> {
    if (!redId?.trim()) {
      throw new BadRequestException('Debes seleccionar una red');
    }

    const safeRedId = sanitizeEntityIdOrThrow(redId, 'ID de red');
    const red = await this.redRepository.findOneBy({ id: safeRedId });

    if (!red) {
      throw new NotFoundException('La red seleccionada no existe');
    }

    const rawRows = await this.personaRepository
      .createQueryBuilder('persona')
      .select('persona.nombres', 'nombres')
      .addSelect('persona.apellidos', 'apellidos')
      .addSelect('persona.documento', 'documento')
      .addSelect('persona.celular', 'celular')
      .addSelect('persona.fechaNacimiento', 'fechaNacimiento')
      .addSelect('persona.correo', 'correo')
      .addSelect('persona.encuentro', 'encuentro')
      .where('persona.idRed = :redId', { redId: safeRedId })
      .orderBy('persona.apellidos', 'ASC')
      .addOrderBy('persona.nombres', 'ASC')
      .addOrderBy('persona.id', 'ASC')
      .getRawMany<PersonaCensoRowDto>();

    return {
      redId: red.id,
      redNombre: red.nombre?.trim() || red.id,
      rows: rawRows.map((row) => ({
        nombres: row.nombres ?? null,
        apellidos: row.apellidos ?? null,
        documento: row.documento ?? null,
        celular: row.celular ?? null,
        fechaNacimiento: row.fechaNacimiento ?? null,
        correo: row.correo ?? null,
        encuentro: row.encuentro ?? null,
      })),
    };
  }

  async findOneForRead(id: string): Promise<PersonaReadDto | null> {
    const row = await this.createPersonaReadQuery()
      .where('persona.id = :id', { id })
      .getRawOne<PersonaReadRow>();

    return row ? this.mapPersonaReadRow(row) : null;
  }

  async findByCelularForRead(celular: string): Promise<PersonaReadDto | null> {
    const row = await this.createPersonaReadQuery()
      .where('persona.celular = :celular', { celular })
      .getRawOne<PersonaReadRow>();

    return row ? this.mapPersonaReadRow(row) : null;
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

    const needsPassword =
      dto.rol === Rol.ADMIN ||
      dto.rol === Rol.SUPER_ADMIN ||
      dto.rol === Rol.LIDER_CASA_DE_PAZ;
    if (needsPassword && !dto.password) {
      throw new BadRequestException(
        'Los roles ADMIN, SUPER_ADMIN y LIDER_CASA_DE_PAZ requieren contraseña',
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
      roles: normalizeRoles({ rol: dto.rol }),
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
      roles: normalizeRoles({ rol: Rol.PERSONAL_ADMINISTRATIVO }),
      password: hashedPassword,
      documento,
      correo,
    });

    const updated = await this.findOneOrThrow(persona.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = updated;
    return result as Omit<Persona, 'password'>;
  }

  async assignCasaDePazLeader(
    dto: AssignCasaDePazLeaderDto,
  ): Promise<Omit<Persona, 'password'>> {
    const personaId = sanitizeEntityIdOrThrow(dto.personaId, 'ID de persona');
    const persona = await this.findOneOrThrow(personaId);

    if (!persona.documento) {
      throw new BadRequestException(
        'La persona debe tener documento registrado para habilitar el acceso inicial',
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

    const roles = normalizeRoles({
      roles: [...(persona.roles ?? []), persona.rol, Rol.LIDER_CASA_DE_PAZ],
    });

    const updatePayload: Partial<Persona> = {
      rol: getPrimaryRole({ roles, rol: persona.rol }),
      roles,
      documento,
      correo,
    };

    if (!persona.password) {
      updatePayload.password = await bcrypt.hash(documento, 10);
    }

    await this.personaRepository.update(persona.id, updatePayload);

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

  private extractRequestedRedId(
    data: Partial<Persona>,
  ): string | null | undefined {
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

  private createPersonaReadQuery() {
    return this.personaRepository
      .createQueryBuilder('persona')
      .leftJoin('persona.red', 'red')
      .leftJoin('red.sede', 'sede')
      .leftJoin('persona.invitadoPor', 'invitador')
      .select('persona.id', 'id')
      .addSelect('persona.nombres', 'nombres')
      .addSelect('persona.apellidos', 'apellidos')
      .addSelect('persona.edad', 'edad')
      .addSelect('persona.celular', 'celular')
      .addSelect('persona.tipoDocumento', 'tipoDocumento')
      .addSelect('persona.documento', 'documento')
      .addSelect('persona.genero', 'genero')
      .addSelect('persona.direccion', 'direccion')
      .addSelect('persona.correo', 'correo')
      .addSelect('persona.encuentro', 'encuentro')
      .addSelect('persona.rol', 'rol')
      .addSelect('CAST(persona.roles AS text[])', 'roles')
      .addSelect('persona.barrio', 'barrio')
      .addSelect('persona.departamento', 'departamento')
      .addSelect('persona.ciudad', 'ciudad')
      .addSelect('persona.fechaNacimiento', 'fechaNacimiento')
      .addSelect('persona.idRed', 'idRed')
      .addSelect('red.id', 'redId')
      .addSelect('red.nombre', 'redNombre')
      .addSelect('red.detalles', 'redDetalles')
      .addSelect('red.idSede', 'redIdSede')
      .addSelect('sede.id', 'sedeId')
      .addSelect('sede.nombre', 'sedeNombre')
      .addSelect('sede.direccion', 'sedeDireccion')
      .addSelect('invitador.id', 'invitadoPorId')
      .addSelect('invitador.nombres', 'invitadoPorNombres')
      .addSelect('invitador.apellidos', 'invitadoPorApellidos')
      .addSelect('persona.fechaCreacion', 'fechaCreacion')
      .addSelect('persona.fechaModificacion', 'fechaModificacion');
  }

  private mapPersonaReadRow(row: PersonaReadRow): PersonaReadDto {
    const roles = normalizeRoles({ rol: row.rol, roles: row.roles });

    return {
      id: row.id,
      nombres: row.nombres,
      apellidos: row.apellidos,
      edad: row.edad,
      celular: row.celular,
      tipoDocumento: row.tipoDocumento,
      documento: row.documento,
      genero: row.genero,
      direccion: row.direccion,
      correo: row.correo,
      encuentro: row.encuentro,
      rol: getPrimaryRole({ roles }),
      roles,
      barrio: row.barrio,
      departamento: row.departamento,
      ciudad: row.ciudad,
      fechaNacimiento: row.fechaNacimiento,
      idRed: row.idRed,
      red: row.redId
        ? {
            id: row.redId,
            nombre: row.redNombre,
            detalles: row.redDetalles,
            idSede: row.redIdSede,
            sede: row.sedeId
              ? {
                  id: row.sedeId,
                  nombre: row.sedeNombre,
                  direccion: row.sedeDireccion,
                }
              : null,
          }
        : null,
      invitadoPor: row.invitadoPorId
        ? {
            id: row.invitadoPorId,
            nombres: row.invitadoPorNombres,
            apellidos: row.invitadoPorApellidos,
          }
        : null,
      fechaCreacion: row.fechaCreacion,
      fechaModificacion: row.fechaModificacion,
    };
  }
}
