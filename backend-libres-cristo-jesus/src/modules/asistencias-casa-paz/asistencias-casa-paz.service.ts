import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsistenciaCasaPazQr } from './asistencia-casa-paz-qr.entity';
import { RegistroAsistenciaCasaPazQr } from './registro-asistencia-casa-paz-qr.entity';
import { Red } from '../redes/red.entity';
import { Persona } from '../personas/persona.entity';
import { Sede } from '../sedes/sede.entity';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaCasaPaz } from '../../common/enums/estado-asistencia-casa-paz.enum';
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

interface AttendanceDateSummary {
  fecha: string;
  totalAsistentes: number;
  totalNuevos: number;
}

interface AttendanceRedSummary {
  idRed: string | null;
  nombreRed: string | null;
  totalAsistentes: number;
}

export interface ListAsistenciasCasaPazQuery {
  search?: string;
  estado?: EstadoAsistenciaCasaPaz;
  page?: string;
  limit?: string;
}

export interface ListRegistrosCasaPazQuery {
  search?: string;
  soloNuevos?: string;
  fecha?: string;
  page?: string;
  limit?: string;
}

export interface CreateAsistenciaCasaPazDto {
  nombre: string;
  idRed: string;
  direccionCasa: string;
  diaRegistro: DiaPredica;
  estado?: EstadoAsistenciaCasaPaz;
}

export interface UpdateAsistenciaCasaPazDto {
  nombre?: string;
  idRed?: string;
  direccionCasa?: string;
  diaRegistro?: DiaPredica;
  estado?: EstadoAsistenciaCasaPaz;
}

export interface PersonaRegistroPublicoDto {
  nombres: string;
  apellidos: string;
  celular: string;
  idRed?: string;
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

export interface RegistrarAsistenciaPublicaCasaPazDto {
  documento: string;
  persona?: PersonaRegistroPublicoDto;
}

@Injectable()
export class AsistenciasCasaPazService {
  constructor(
    @InjectRepository(AsistenciaCasaPazQr)
    private readonly asistenciaCasaPazRepo: Repository<AsistenciaCasaPazQr>,

    @InjectRepository(RegistroAsistenciaCasaPazQr)
    private readonly registroCasaPazRepo: Repository<RegistroAsistenciaCasaPazQr>,

    @InjectRepository(Red)
    private readonly redRepo: Repository<Red>,

    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,

    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
  ) {}

  async findAll(
    query: ListAsistenciasCasaPazQuery,
  ): Promise<PaginationResult<AsistenciaCasaPazQr>> {
    const { page, limit } = this.getPagination(query.page, query.limit);

    const qb = this.asistenciaCasaPazRepo
      .createQueryBuilder('asistencia')
      .leftJoinAndSelect('asistencia.red', 'red')
      .orderBy('asistencia.fechaCreacion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const search = buildLikeSearchParam(query.search);
    if (search) {
      qb.andWhere(
        `(LOWER(asistencia.nombre) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(asistencia.direccionCasa, '')) LIKE :search ESCAPE '!'
          OR LOWER(COALESCE(red.nombre, '')) LIKE :search ESCAPE '!')`,
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

  async findOne(id: string): Promise<AsistenciaCasaPazQr> {
    const safeId = sanitizeEntityIdOrThrow(id, 'ID de asistencia');

    const asistencia = await this.asistenciaCasaPazRepo.findOne({
      where: { id: safeId },
      relations: ['red'],
    });

    if (!asistencia) {
      throw new NotFoundException('Asistencia de casa de paz no encontrada');
    }

    return asistencia;
  }

  async create(
    payload: CreateAsistenciaCasaPazDto,
  ): Promise<AsistenciaCasaPazQr> {
    const idRed = sanitizeEntityIdOrThrow(payload.idRed, 'ID de red');
    const direccionCasa = sanitizeRequiredTextOrThrow(
      payload.direccionCasa,
      'Dirección de casa',
      255,
    );

    await this.ensureRedExists(idRed);

    const entity = this.asistenciaCasaPazRepo.create({
      nombre: sanitizeRequiredTextOrThrow(payload.nombre, 'Nombre', 150),
      diaRegistro: payload.diaRegistro,
      estado: payload.estado ?? EstadoAsistenciaCasaPaz.ACTIVO,
      idRed,
      direccionCasa,
    });

    return this.asistenciaCasaPazRepo.save(entity);
  }

  async update(
    id: string,
    payload: UpdateAsistenciaCasaPazDto,
  ): Promise<AsistenciaCasaPazQr> {
    const asistencia = await this.findOne(id);

    if (payload.nombre !== undefined) {
      const nombre = sanitizeRequiredTextOrThrow(payload.nombre, 'Nombre', 150);
      asistencia.nombre = nombre;
    }

    if (payload.direccionCasa !== undefined) {
      const direccion = sanitizeRequiredTextOrThrow(
        payload.direccionCasa,
        'Dirección de casa',
        255,
      );
      asistencia.direccionCasa = direccion;
    }

    if (payload.idRed !== undefined) {
      const idRed = sanitizeEntityIdOrThrow(payload.idRed, 'ID de red');
      await this.ensureRedExists(idRed);
      asistencia.idRed = idRed;
    }

    if (payload.diaRegistro !== undefined) {
      asistencia.diaRegistro = payload.diaRegistro;
    }

    if (payload.estado !== undefined) {
      asistencia.estado = payload.estado;
    }

    return this.asistenciaCasaPazRepo.save(asistencia);
  }

  async setEstado(
    id: string,
    estado: EstadoAsistenciaCasaPaz,
  ): Promise<AsistenciaCasaPazQr> {
    const asistencia = await this.findOne(id);
    asistencia.estado = estado;
    return this.asistenciaCasaPazRepo.save(asistencia);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.asistenciaCasaPazRepo.delete(id);
  }

  async findRegistrosByAsistencia(
    asistenciaId: string,
    query: ListRegistrosCasaPazQuery,
  ): Promise<PaginationResult<RegistroAsistenciaCasaPazQr>> {
    await this.findOne(asistenciaId);

    const { page, limit } = this.getPagination(query.page, query.limit);
    const fecha = this.normalizeFechaFiltro(query.fecha);

    const qb = this.registroCasaPazRepo
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

    const rows = await this.registroCasaPazRepo
      .createQueryBuilder('registro')
      .select('registro.fechaRegistro', 'fechaRegistro')
      .where('registro.idAsistencia = :asistenciaId', { asistenciaId })
      .distinct(true)
      .orderBy('registro.fechaRegistro', 'DESC')
      .getRawMany<{ fechaRegistro: string | Date }>();

    return rows.map((row) => normalizeAttendanceDateOrThrow(row.fechaRegistro));
  }

  async findResumenByAsistencia(
    asistenciaId: string,
    fechaRaw: string,
  ): Promise<AttendanceDateSummary> {
    await this.findOne(asistenciaId);

    const fecha = normalizeAttendanceDateOrThrow(
      fechaRaw,
      'La fecha de asistencia',
    );

    const raw = await this.registroCasaPazRepo
      .createQueryBuilder('registro')
      .select('COUNT(*)', 'totalAsistentes')
      .addSelect(
        'COALESCE(SUM(CASE WHEN registro.esNuevo = true THEN 1 ELSE 0 END), 0)',
        'totalNuevos',
      )
      .where('registro.idAsistencia = :asistenciaId', { asistenciaId })
      .andWhere('registro.fechaRegistro = :fecha', { fecha })
      .getRawOne<{ totalAsistentes: string; totalNuevos: string }>();

    return {
      fecha,
      totalAsistentes: Number(raw?.totalAsistentes ?? 0),
      totalNuevos: Number(raw?.totalNuevos ?? 0),
    };
  }

  async findResumenPorRedByAsistencia(
    asistenciaId: string,
    fechaRaw: string,
  ): Promise<AttendanceRedSummary[]> {
    await this.findOne(asistenciaId);

    const fecha = normalizeAttendanceDateOrThrow(
      fechaRaw,
      'La fecha de asistencia',
    );

    const rows = await this.registroCasaPazRepo
      .createQueryBuilder('registro')
      .leftJoin('registro.persona', 'persona')
      .leftJoin('persona.red', 'red')
      .select('persona.red_id', 'idRed')
      .addSelect('red.nombre', 'nombreRed')
      .addSelect('COUNT(*)', 'totalAsistentes')
      .where('registro.idAsistencia = :asistenciaId', { asistenciaId })
      .andWhere('registro.fechaRegistro = :fecha', { fecha })
      .groupBy('persona.red_id')
      .addGroupBy('red.nombre')
      .orderBy('COUNT(*)', 'DESC')
      .addOrderBy('red.nombre', 'ASC')
      .getRawMany<{
        idRed: string | null;
        nombreRed: string | null;
        totalAsistentes: string;
      }>();

    return rows.map((row) => ({
      idRed: row.idRed ?? null,
      nombreRed: row.nombreRed ?? null,
      totalAsistentes: Number(row.totalAsistentes ?? 0),
    }));
  }

  async getPublicByToken(token: string): Promise<AsistenciaCasaPazQr> {
    const safeToken = sanitizeTokenOrThrow(token);

    const asistencia = await this.asistenciaCasaPazRepo.findOne({
      where: { qrToken: safeToken },
      relations: ['red'],
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
    payload: RegistrarAsistenciaPublicaCasaPazDto,
  ): Promise<{
    alreadyRegistered: boolean;
    esNuevo: boolean;
    needsProfileCompletion: boolean;
    persona: Persona;
    registroId: string;
    fechaRegistro: string;
  }> {
    const safeToken = sanitizeTokenOrThrow(token);
    const asistencia = await this.getPublicByToken(safeToken);

    if (asistencia.estado !== EstadoAsistenciaCasaPaz.ACTIVO) {
      throw new BadRequestException('Esta asistencia se encuentra inactiva');
    }

    const diaActual = this.getDiaPredicaFromDate(new Date());
    if (diaActual !== asistencia.diaRegistro) {
      throw new BadRequestException(
        `Esta asistencia solo permite registros el día ${asistencia.diaRegistro}`,
      );
    }

    const documento = sanitizeDocumentoOrThrow(payload.documento);

    let persona = await this.personaRepo.findOne({
      where: { documento },
      relations: ['red', 'red.sede'],
    });
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

    const existente = await this.registroCasaPazRepo.findOneBy({
      idAsistencia: asistencia.id,
      idPersona: persona.id,
      fechaRegistro,
    });

    if (existente) {
      return {
        alreadyRegistered: true,
        esNuevo: existente.esNuevo,
        needsProfileCompletion: !existente.esNuevo && !persona.idRed,
        persona,
        registroId: existente.id,
        fechaRegistro,
      };
    }

    const registro = this.registroCasaPazRepo.create({
      idAsistencia: asistencia.id,
      idPersona: persona.id,
      fechaRegistro,
      esNuevo,
    });

    try {
      const saved = await this.registroCasaPazRepo.save(registro);
      return {
        alreadyRegistered: false,
        esNuevo,
        needsProfileCompletion: !esNuevo && !persona.idRed,
        persona,
        registroId: saved.id,
        fechaRegistro,
      };
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        const duplicated = await this.registroCasaPazRepo.findOneBy({
          idAsistencia: asistencia.id,
          idPersona: persona.id,
          fechaRegistro,
        });

        if (duplicated) {
          return {
            alreadyRegistered: true,
            esNuevo: duplicated.esNuevo,
            needsProfileCompletion: !duplicated.esNuevo && !persona.idRed,
            persona,
            registroId: duplicated.id,
            fechaRegistro,
          };
        }
      }

      throw error;
    }
  }

  private async ensureRedExists(idRed: string): Promise<void> {
    const red = await this.redRepo.findOneBy({ id: idRed });
    if (!red) {
      throw new NotFoundException('La red seleccionada no existe');
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
    const idRed = data.idRed
      ? sanitizeEntityIdOrThrow(data.idRed, 'ID de red')
      : null;

    if (idRed) {
      await this.ensureRedExists(idRed);
    }

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
      idRed,
      rol: Rol.INTEGRANTE,
    });

    const saved = await this.personaRepo.save(entity);
    const persona = await this.personaRepo.findOne({
      where: { id: saved.id },
      relations: ['red', 'red.sede'],
    });

    if (!persona) {
      throw new NotFoundException('Persona no encontrada después del registro');
    }

    return persona;
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
