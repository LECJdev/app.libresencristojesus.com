import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsistenciaDominical } from './asistencia-dominical.entity';
import { RegistroAsistenciaDominical } from './registro-asistencia-dominical.entity';
import { Sede } from '../sedes/sede.entity';
import { Persona } from '../personas/persona.entity';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';
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
import {
  normalizeAttendanceDateOrThrow,
  normalizeOptionalAttendanceDateOrThrow,
} from '../../common/utils/attendance-date.util';

interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListAsistenciasDominicalesQuery {
  search?: string;
  estado?: EstadoAsistenciaDominical;
  page?: string;
  limit?: string;
}

export interface ListRegistrosDominicalesQuery {
  search?: string;
  soloNuevos?: string;
  fecha?: string;
  page?: string;
  limit?: string;
}

export interface CreateAsistenciaDominicalDto {
  nombre: string;
  idSede: string;
  diaRegistro: DiaPredica;
  estado?: EstadoAsistenciaDominical;
}

export interface UpdateAsistenciaDominicalDto {
  nombre?: string;
  idSede?: string;
  diaRegistro?: DiaPredica;
  estado?: EstadoAsistenciaDominical;
}

export interface PersonaRegistroPublicoDto {
  nombres: string;
  apellidos: string;
  celular: string;
  tipoDocumento?: TipoDocumento;
  direccion?: string;
  correo?: string;
  edad?: number;
  departamento?: string;
  ciudad?: string;
  barrio?: string;
  genero?: Genero;
  fechaNacimiento?: string;
}

export interface RegistrarAsistenciaPublicaDto {
  documento: string;
  persona?: PersonaRegistroPublicoDto;
}

@Injectable()
export class AsistenciasDominicalesService {
  constructor(
    @InjectRepository(AsistenciaDominical)
    private readonly asistenciaDominicalRepo: Repository<AsistenciaDominical>,

    @InjectRepository(RegistroAsistenciaDominical)
    private readonly registroDominicalRepo: Repository<RegistroAsistenciaDominical>,

    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,

    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
  ) {}

  async findAll(
    query: ListAsistenciasDominicalesQuery,
  ): Promise<PaginationResult<AsistenciaDominical>> {
    const { page, limit } = this.getPagination(query.page, query.limit);

    const qb = this.asistenciaDominicalRepo
      .createQueryBuilder('asistencia')
      .leftJoinAndSelect('asistencia.sede', 'sede')
      .orderBy('asistencia.fechaCreacion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const search = buildLikeSearchParam(query.search);
    if (search) {
      qb.andWhere(
        "(LOWER(asistencia.nombre) LIKE :search ESCAPE '!' OR LOWER(COALESCE(sede.nombre, '')) LIKE :search ESCAPE '!')",
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

  async findOne(id: string): Promise<AsistenciaDominical> {
    const safeId = sanitizeEntityIdOrThrow(id, 'ID de asistencia');

    const asistencia = await this.asistenciaDominicalRepo.findOne({
      where: { id: safeId },
      relations: ['sede'],
    });

    if (!asistencia) {
      throw new NotFoundException('Asistencia dominical no encontrada');
    }

    return asistencia;
  }

  async create(
    payload: CreateAsistenciaDominicalDto,
  ): Promise<AsistenciaDominical> {
    const idSede = sanitizeEntityIdOrThrow(payload.idSede, 'ID de sede');
    await this.ensureSedeExists(idSede);

    const entity = this.asistenciaDominicalRepo.create({
      nombre: sanitizeRequiredTextOrThrow(payload.nombre, 'Nombre', 150),
      idSede,
      diaRegistro: payload.diaRegistro,
      estado: payload.estado ?? EstadoAsistenciaDominical.ACTIVO,
    });

    return this.asistenciaDominicalRepo.save(entity);
  }

  async update(
    id: string,
    payload: UpdateAsistenciaDominicalDto,
  ): Promise<AsistenciaDominical> {
    const asistencia = await this.findOne(id);

    if (payload.idSede) {
      const idSede = sanitizeEntityIdOrThrow(payload.idSede, 'ID de sede');
      await this.ensureSedeExists(idSede);
      asistencia.idSede = idSede;
    }

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

    return this.asistenciaDominicalRepo.save(asistencia);
  }

  async setEstado(
    id: string,
    estado: EstadoAsistenciaDominical,
  ): Promise<AsistenciaDominical> {
    const asistencia = await this.findOne(id);
    asistencia.estado = estado;
    return this.asistenciaDominicalRepo.save(asistencia);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.asistenciaDominicalRepo.delete(id);
  }

  async findRegistrosByAsistencia(
    asistenciaId: string,
    query: ListRegistrosDominicalesQuery,
  ): Promise<PaginationResult<RegistroAsistenciaDominical>> {
    await this.findOne(asistenciaId);

    const { page, limit } = this.getPagination(query.page, query.limit);
    const fecha = this.normalizeFechaFiltro(query.fecha);

    const qb = this.registroDominicalRepo
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

    if (fecha) {
      qb.andWhere('registro.fechaRegistro = :fecha', { fecha });
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

  async findFechasDisponiblesByAsistencia(
    asistenciaId: string,
  ): Promise<string[]> {
    await this.findOne(asistenciaId);

    const rows = await this.registroDominicalRepo
      .createQueryBuilder('registro')
      .select('registro.fechaRegistro', 'fechaRegistro')
      .where('registro.idAsistencia = :asistenciaId', { asistenciaId })
      .distinct(true)
      .orderBy('registro.fechaRegistro', 'DESC')
      .getRawMany<{ fechaRegistro: string }>();

    return rows.map((row) => normalizeAttendanceDateOrThrow(row.fechaRegistro));
  }

  async getPublicByToken(token: string): Promise<AsistenciaDominical> {
    const safeToken = sanitizeTokenOrThrow(token);

    const asistencia = await this.asistenciaDominicalRepo.findOne({
      where: { qrToken: safeToken },
      relations: ['sede'],
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
    payload: RegistrarAsistenciaPublicaDto,
  ): Promise<{
    alreadyRegistered: boolean;
    esNuevo: boolean;
    persona: Persona;
    registroId: string;
    fechaRegistro: string;
  }> {
    const safeToken = sanitizeTokenOrThrow(token);
    const asistencia = await this.getPublicByToken(safeToken);

    if (asistencia.estado !== EstadoAsistenciaDominical.ACTIVO) {
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

    const existente = await this.registroDominicalRepo.findOneBy({
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

    const registro = this.registroDominicalRepo.create({
      idAsistencia: asistencia.id,
      idPersona: persona.id,
      fechaRegistro,
      esNuevo,
    });

    try {
      const saved = await this.registroDominicalRepo.save(registro);
      return {
        alreadyRegistered: false,
        esNuevo,
        persona,
        registroId: saved.id,
        fechaRegistro,
      };
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        const duplicated = await this.registroDominicalRepo.findOneBy({
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

  private async ensureSedeExists(idSede: string): Promise<void> {
    const sede = await this.sedeRepo.findOneBy({ id: idSede });
    if (!sede) {
      throw new NotFoundException('La sede seleccionada no existe');
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
      departamento: sanitizeOptionalText(data.departamento, 150),
      ciudad: sanitizeOptionalText(data.ciudad, 150),
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

  private normalizeFechaFiltro(fecha?: string): string | undefined {
    return normalizeOptionalAttendanceDateOrThrow(fecha);
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
