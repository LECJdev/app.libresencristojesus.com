import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsistenciaDicipuladoQr } from './asistencia-dicipulado-qr.entity';
import { RegistroAsistenciaDicipuladoQr } from './registro-asistencia-dicipulado-qr.entity';
import { Sede } from '../sedes/sede.entity';
import { Red } from '../redes/red.entity';
import { Persona } from '../personas/persona.entity';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaDicipulado } from '../../common/enums/estado-asistencia-dicipulado.enum';
import { Rol } from '../../common/enums/rol.enum';
import { TipoDocumento } from '../../common/enums/tipo-documento.enum';
import { Genero } from '../../common/enums/genero.enum';
import {
  buildLikeSearchParam,
  sanitizeCelularOrThrow,
  sanitizeDocumentoOrThrow,
  sanitizeEntityIdOrThrow,
  sanitizeNombreOrThrow,
  sanitizeOptionalEdad,
  sanitizeOptionalEmail,
  sanitizeOptionalText,
  sanitizeRequiredTextOrThrow,
  sanitizeTokenOrThrow,
} from '../../common/utils/input-security.util';

interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListAsistenciasDicipuladosQuery {
  search?: string;
  estado?: EstadoAsistenciaDicipulado;
  page?: string;
  limit?: string;
}

export interface ListRegistrosDicipuladosQuery {
  search?: string;
  soloNuevos?: string;
  page?: string;
  limit?: string;
}

export interface CreateAsistenciaDicipuladoDto {
  nombre: string;
  idSede?: string;
  direccionPersonalizada?: string;
  idRed?: string;
  diaRegistro: DiaPredica;
  estado?: EstadoAsistenciaDicipulado;
}

export interface UpdateAsistenciaDicipuladoDto {
  nombre?: string;
  idSede?: string;
  direccionPersonalizada?: string;
  idRed?: string;
  diaRegistro?: DiaPredica;
  estado?: EstadoAsistenciaDicipulado;
}

export interface PersonaRegistroPublicoDto {
  nombres: string;
  apellidos: string;
  celular: string;
  tipoDocumento?: TipoDocumento;
  direccion?: string;
  correo?: string;
  edad?: number;
  barrio?: string;
  genero?: Genero;
  fechaNacimiento?: string;
}

export interface RegistrarAsistenciaPublicaDicipuladoDto {
  documento: string;
  persona?: PersonaRegistroPublicoDto;
}

@Injectable()
export class AsistenciasDicipuladosService {
  constructor(
    @InjectRepository(AsistenciaDicipuladoQr)
    private readonly asistenciaDicipuladoRepo: Repository<AsistenciaDicipuladoQr>,

    @InjectRepository(RegistroAsistenciaDicipuladoQr)
    private readonly registroDicipuladoRepo: Repository<RegistroAsistenciaDicipuladoQr>,

    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,

    @InjectRepository(Red)
    private readonly redRepo: Repository<Red>,

    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
  ) {}

  async findAll(
    query: ListAsistenciasDicipuladosQuery,
  ): Promise<PaginationResult<AsistenciaDicipuladoQr>> {
    const { page, limit } = this.getPagination(query.page, query.limit);

    const qb = this.asistenciaDicipuladoRepo
      .createQueryBuilder('asistencia')
      .leftJoinAndSelect('asistencia.sede', 'sede')
      .leftJoinAndSelect('asistencia.red', 'red')
      .orderBy('asistencia.fechaCreacion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const search = buildLikeSearchParam(query.search);
    if (search) {
      qb.andWhere(
        `(LOWER(asistencia.nombre) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(sede.nombre, '')) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(red.nombre, '')) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(asistencia.direccionPersonalizada, '')) LIKE :search ESCAPE '!')`,
        { search },
      );
    }

    if (query.estado) {
      qb.andWhere('asistencia.estado = :estado', { estado: query.estado });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string): Promise<AsistenciaDicipuladoQr> {
    const safeId = sanitizeEntityIdOrThrow(id, 'ID de asistencia');

    const asistencia = await this.asistenciaDicipuladoRepo.findOne({
      where: { id: safeId },
      relations: ['sede', 'red'],
    });

    if (!asistencia) {
      throw new NotFoundException('Asistencia de dicipulado no encontrada');
    }

    return asistencia;
  }

  async create(
    payload: CreateAsistenciaDicipuladoDto,
  ): Promise<AsistenciaDicipuladoQr> {
    const normalized = await this.resolveLocationAndRed(payload);

    const entity = this.asistenciaDicipuladoRepo.create({
      nombre: sanitizeRequiredTextOrThrow(payload.nombre, 'Nombre', 150),
      diaRegistro: payload.diaRegistro,
      estado: payload.estado ?? EstadoAsistenciaDicipulado.ACTIVO,
      ...normalized,
    });

    return this.asistenciaDicipuladoRepo.save(entity);
  }

  async update(
    id: string,
    payload: UpdateAsistenciaDicipuladoDto,
  ): Promise<AsistenciaDicipuladoQr> {
    const asistencia = await this.findOne(id);

    if (payload.nombre !== undefined) {
      asistencia.nombre = sanitizeRequiredTextOrThrow(
        payload.nombre,
        'Nombre',
        150,
      );
    }

    if (payload.diaRegistro !== undefined) {
      asistencia.diaRegistro = payload.diaRegistro;
    }

    if (payload.estado !== undefined) {
      asistencia.estado = payload.estado;
    }

    if (
      payload.idSede !== undefined ||
      payload.direccionPersonalizada !== undefined ||
      payload.idRed !== undefined
    ) {
      const normalized = await this.resolveLocationAndRed({
        idSede: payload.idSede ?? asistencia.idSede ?? undefined,
        direccionPersonalizada:
          payload.direccionPersonalizada ??
          asistencia.direccionPersonalizada ??
          undefined,
        idRed: payload.idRed ?? asistencia.idRed ?? undefined,
      });

      asistencia.idSede = normalized.idSede;
      asistencia.direccionPersonalizada = normalized.direccionPersonalizada;
      asistencia.idRed = normalized.idRed;
    }

    return this.asistenciaDicipuladoRepo.save(asistencia);
  }

  async setEstado(
    id: string,
    estado: EstadoAsistenciaDicipulado,
  ): Promise<AsistenciaDicipuladoQr> {
    const asistencia = await this.findOne(id);
    asistencia.estado = estado;
    return this.asistenciaDicipuladoRepo.save(asistencia);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.asistenciaDicipuladoRepo.delete(id);
  }

  async findRegistrosByAsistencia(
    asistenciaId: string,
    query: ListRegistrosDicipuladosQuery,
  ): Promise<PaginationResult<RegistroAsistenciaDicipuladoQr>> {
    await this.findOne(asistenciaId);

    const { page, limit } = this.getPagination(query.page, query.limit);

    const qb = this.registroDicipuladoRepo
      .createQueryBuilder('registro')
      .leftJoinAndSelect('registro.persona', 'persona')
      .where('registro.idAsistencia = :asistenciaId', { asistenciaId })
      .orderBy('registro.fechaRegistro', 'DESC')
      .addOrderBy('registro.fechaCreacion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const search = buildLikeSearchParam(query.search);
    if (search) {
      qb.andWhere(
        `(
          LOWER(COALESCE(persona.nombres, '')) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(persona.apellidos, '')) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(persona.documento, '')) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(persona.celular, '')) LIKE :search ESCAPE '!'
        )`,
        { search },
      );
    }

    if (query.soloNuevos === 'true') {
      qb.andWhere('registro.esNuevo = true');
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getPublicByToken(token: string): Promise<AsistenciaDicipuladoQr> {
    const safeToken = sanitizeTokenOrThrow(token);

    const asistencia = await this.asistenciaDicipuladoRepo.findOne({
      where: { qrToken: safeToken },
      relations: ['sede', 'red'],
    });

    if (!asistencia) {
      throw new NotFoundException(
        'No se encontró una asistencia válida para este QR',
      );
    }

    return asistencia;
  }

  async registrarPublico(
    token: string,
    payload: RegistrarAsistenciaPublicaDicipuladoDto,
  ): Promise<{
    alreadyRegistered: boolean;
    esNuevo: boolean;
    persona: Persona;
    registroId: string;
    fechaRegistro: string;
  }> {
    const safeToken = sanitizeTokenOrThrow(token);
    const asistencia = await this.getPublicByToken(safeToken);

    if (asistencia.estado !== EstadoAsistenciaDicipulado.ACTIVO) {
      throw new BadRequestException('Esta asistencia se encuentra inactiva');
    }

    const diaActual = this.getDiaPredicaFromDate(new Date());
    if (diaActual !== asistencia.diaRegistro) {
      throw new BadRequestException(
        `Esta asistencia solo permite registros el día ${asistencia.diaRegistro}`,
      );
    }

    const documento = sanitizeDocumentoOrThrow(payload.documento);

    let persona = await this.personaRepo.findOne({ where: { documento } });
    let esNuevo = false;

    if (!persona) {
      if (!payload.persona) {
        throw new NotFoundException(
          'Persona no encontrada. Completa el formulario para continuar.',
        );
      }

      persona = await this.crearPersonaDesdeRegistro(
        documento,
        payload.persona,
      );
      esNuevo = true;
    }

    const fechaRegistro = this.getCurrentDateString();

    const existente = await this.registroDicipuladoRepo.findOneBy({
      idAsistencia: asistencia.id,
      idPersona: persona.id,
      fechaRegistro,
    });

    if (existente) {
      return {
        alreadyRegistered: true,
        esNuevo: existente.esNuevo,
        persona,
        registroId: existente.id,
        fechaRegistro,
      };
    }

    const registro = this.registroDicipuladoRepo.create({
      idAsistencia: asistencia.id,
      idPersona: persona.id,
      fechaRegistro,
      esNuevo,
    });

    try {
      const saved = await this.registroDicipuladoRepo.save(registro);
      return {
        alreadyRegistered: false,
        esNuevo,
        persona,
        registroId: saved.id,
        fechaRegistro,
      };
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        const duplicated = await this.registroDicipuladoRepo.findOneBy({
          idAsistencia: asistencia.id,
          idPersona: persona.id,
          fechaRegistro,
        });

        if (duplicated) {
          return {
            alreadyRegistered: true,
            esNuevo: duplicated.esNuevo,
            persona,
            registroId: duplicated.id,
            fechaRegistro,
          };
        }
      }

      throw error;
    }
  }

  private async resolveLocationAndRed(payload: {
    idSede?: string;
    direccionPersonalizada?: string;
    idRed?: string;
  }): Promise<{
    idSede: string | null;
    direccionPersonalizada: string | null;
    idRed: string | null;
  }> {
    const idSede = payload.idSede
      ? sanitizeEntityIdOrThrow(payload.idSede, 'ID de sede')
      : null;
    const direccionPersonalizada = sanitizeOptionalText(
      payload.direccionPersonalizada,
      255,
    );
    const idRed = payload.idRed
      ? sanitizeEntityIdOrThrow(payload.idRed, 'ID de red')
      : null;

    if (!idSede && !direccionPersonalizada) {
      throw new BadRequestException(
        'Debes seleccionar una sede o ingresar una dirección personalizada',
      );
    }

    if (idSede && direccionPersonalizada) {
      throw new BadRequestException(
        'Solo puedes usar sede o dirección personalizada, no ambas',
      );
    }

    if (idSede) {
      await this.ensureSedeExists(idSede);
    }

    if (idRed) {
      await this.ensureRedExists(idRed);
    }

    return {
      idSede,
      direccionPersonalizada,
      idRed,
    };
  }

  private async ensureSedeExists(idSede: string): Promise<void> {
    const sede = await this.sedeRepo.findOneBy({ id: idSede });
    if (!sede) {
      throw new NotFoundException('La sede seleccionada no existe');
    }
  }

  private async ensureRedExists(idRed: string): Promise<void> {
    const red = await this.redRepo.findOneBy({ id: idRed });
    if (!red) {
      throw new NotFoundException('La red seleccionada no existe');
    }
  }

  private async crearPersonaDesdeRegistro(
    documento: string,
    data: PersonaRegistroPublicoDto,
  ): Promise<Persona> {
    if (
      !data.nombres?.trim() ||
      !data.apellidos?.trim() ||
      !data.celular?.trim()
    ) {
      throw new BadRequestException(
        'Para registrar una persona nueva debes completar nombres, apellidos y celular',
      );
    }

    const nombres = sanitizeNombreOrThrow(data.nombres, 'Nombres');
    const apellidos = sanitizeNombreOrThrow(data.apellidos, 'Apellidos');
    const celular = sanitizeCelularOrThrow(data.celular);

    const entity = this.personaRepo.create({
      nombres,
      apellidos,
      celular,
      documento,
      tipoDocumento: data.tipoDocumento ?? null,
      direccion: sanitizeOptionalText(data.direccion, 255),
      correo: sanitizeOptionalEmail(data.correo),
      edad: sanitizeOptionalEdad(data.edad),
      barrio: sanitizeOptionalText(data.barrio, 120),
      genero: data.genero ?? null,
      fechaNacimiento: data.fechaNacimiento || null,
      rol: Rol.INTEGRANTE,
    });

    return this.personaRepo.save(entity);
  }

  private getPagination(
    pageRaw?: string,
    limitRaw?: string,
  ): {
    page: number;
    limit: number;
  } {
    const parsedPage = Number.parseInt(pageRaw ?? '1', 10);
    const parsedLimit = Number.parseInt(limitRaw ?? '10', 10);

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 10;

    return { page, limit };
  }

  private getDiaPredicaFromDate(date: Date): DiaPredica {
    const map: DiaPredica[] = [
      DiaPredica.DOMINGO,
      DiaPredica.LUNES,
      DiaPredica.MARTES,
      DiaPredica.MIERCOLES,
      DiaPredica.JUEVES,
      DiaPredica.VIERNES,
      DiaPredica.SABADO,
    ];

    return map[date.getDay()];
  }

  private getCurrentDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    if (!('code' in error)) {
      return false;
    }

    return (error as { code?: string }).code === '23505';
  }
}
