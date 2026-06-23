import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsistenciaCasaPazQr } from './asistencia-casa-paz-qr.entity';
import { CasaPazSesion } from './casa-paz-sesion.entity';
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
  getBogotaDateString,
  getBogotaDayOfWeek,
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
  idPersonaACargo?: string | null;
  idAnfitrion?: string | null;
  idLiderPrincipal?: string | null;
}

export interface UpdateAsistenciaCasaPazDto {
  nombre?: string;
  idRed?: string;
  direccionCasa?: string;
  diaRegistro?: DiaPredica;
  estado?: EstadoAsistenciaCasaPaz;
  idPersonaACargo?: string | null;
  idAnfitrion?: string | null;
  idLiderPrincipal?: string | null;
}

export interface CasaPazSesionUpsertDto {
  fecha: string;
  montoOfrenda: number;
}

export interface PersonaRegistroPublicoDto {
  nombreCompleto?: string;
  nombres?: string;
  apellidos?: string;
  celular: string;
  encuentro?: boolean | null;
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

export interface CompletePublicProfileCasaPazDto {
  personaId: string;
  documento: string;
  idRed?: string;
  fechaNacimiento?: string;
}

interface CasaPazSesionResponse {
  fecha: string;
  montoOfrenda: number;
  exists: boolean;
}

interface AdminPersonaRoleDto {
  id: string;
  nombres: string | null;
  apellidos: string | null;
}

interface PublicPersonaRoleDto {
  nombres: string | null;
  apellidos: string | null;
}

interface PublicRedDto {
  id: string;
  nombre: string | null;
}

interface PublicPersonaAttendanceDto {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  fechaNacimiento: string | null;
  red: PublicRedDto | null;
}

interface PublicRegistrationCasaPazResponse {
  alreadyRegistered: boolean;
  esNuevo: boolean;
  needsProfileCompletion: boolean;
  profileCompletion: {
    needsRed: boolean;
    needsFechaNacimiento: boolean;
  };
  persona: PublicPersonaAttendanceDto;
  registroId: string;
  fechaRegistro: string;
}

interface AdminRegistroPersonaCasaPazDto {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  documento: string | null;
  celular: string | null;
}

interface AdminRegistroAsistenciaCasaPazDto {
  id: string;
  fechaRegistro: string;
  esNuevo: boolean;
  persona: AdminRegistroPersonaCasaPazDto | null;
}

export interface PublicAsistenciaCasaPazDto {
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaCasaPaz;
  direccionCasa: string;
  red: PublicRedDto | null;
  personaACargo: PublicPersonaRoleDto | null;
  anfitrion: PublicPersonaRoleDto | null;
  liderPrincipal: PublicPersonaRoleDto | null;
}

export interface AdminAsistenciaCasaPazDto {
  id: string;
  nombre: string;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaCasaPaz;
  qrToken: string;
  idRed: string;
  direccionCasa: string;
  idPersonaACargo: string | null;
  idAnfitrion: string | null;
  idLiderPrincipal: string | null;
  red: PublicRedDto | null;
  personaACargo: AdminPersonaRoleDto | null;
  anfitrion: AdminPersonaRoleDto | null;
  liderPrincipal: AdminPersonaRoleDto | null;
}

const ASISTENCIA_ROLE_RELATIONS = [
  'red',
  'personaACargo',
  'anfitrion',
  'liderPrincipal',
] as const;

@Injectable()
export class AsistenciasCasaPazService {
  constructor(
    @InjectRepository(AsistenciaCasaPazQr)
    private readonly asistenciaCasaPazRepo: Repository<AsistenciaCasaPazQr>,

    @InjectRepository(RegistroAsistenciaCasaPazQr)
    private readonly registroCasaPazRepo: Repository<RegistroAsistenciaCasaPazQr>,

    @InjectRepository(CasaPazSesion)
    private readonly casaPazSesionRepo: Repository<CasaPazSesion>,

    @InjectRepository(Red)
    private readonly redRepo: Repository<Red>,

    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,

    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
  ) {}

  async findAll(
    query: ListAsistenciasCasaPazQuery,
  ): Promise<PaginationResult<AdminAsistenciaCasaPazDto>> {
    const { page, limit } = this.getPagination(query.page, query.limit);

    const qb = this.asistenciaCasaPazRepo
      .createQueryBuilder('asistencia')
      .leftJoinAndSelect('asistencia.red', 'red')
      .leftJoinAndSelect('asistencia.personaACargo', 'personaACargo')
      .leftJoinAndSelect('asistencia.anfitrion', 'anfitrion')
      .leftJoinAndSelect('asistencia.liderPrincipal', 'liderPrincipal')
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
      data: data.map((item) => this.buildAdminAsistenciaResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string): Promise<AdminAsistenciaCasaPazDto> {
    const asistencia = await this.findOneEntity(id);
    return this.buildAdminAsistenciaResponse(asistencia);
  }

  async create(
    payload: CreateAsistenciaCasaPazDto,
  ): Promise<AdminAsistenciaCasaPazDto> {
    const idRed = sanitizeEntityIdOrThrow(payload.idRed, 'ID de red');
    const direccionCasa = sanitizeRequiredTextOrThrow(
      payload.direccionCasa,
      'Dirección de casa',
      255,
    );

    await this.ensureRedExists(idRed);
    const roles = await this.resolveRoleAssignments(payload);

    const entity = this.asistenciaCasaPazRepo.create({
      nombre: sanitizeRequiredTextOrThrow(payload.nombre, 'Nombre', 150),
      diaRegistro: payload.diaRegistro,
      estado: payload.estado ?? EstadoAsistenciaCasaPaz.ACTIVO,
      idRed,
      direccionCasa,
      ...roles,
    });

    const saved = await this.asistenciaCasaPazRepo.save(entity);
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    payload: UpdateAsistenciaCasaPazDto,
  ): Promise<AdminAsistenciaCasaPazDto> {
    const asistencia = await this.findOneEntity(id);

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

    if (payload.idPersonaACargo !== undefined) {
      asistencia.idPersonaACargo = await this.resolveRolePersonaId(
        payload.idPersonaACargo,
        'Persona a cargo',
      );
    }

    if (payload.idAnfitrion !== undefined) {
      asistencia.idAnfitrion = await this.resolveRolePersonaId(
        payload.idAnfitrion,
        'Anfitrión',
      );
    }

    if (payload.idLiderPrincipal !== undefined) {
      asistencia.idLiderPrincipal = await this.resolveRolePersonaId(
        payload.idLiderPrincipal,
        'Líder principal',
      );
    }

    await this.asistenciaCasaPazRepo.save(asistencia);
    return this.findOne(asistencia.id);
  }

  async setEstado(
    id: string,
    estado: EstadoAsistenciaCasaPaz,
  ): Promise<AdminAsistenciaCasaPazDto> {
    const asistencia = await this.findOneEntity(id);
    asistencia.estado = estado;
    await this.asistenciaCasaPazRepo.save(asistencia);
    return this.findOne(asistencia.id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.asistenciaCasaPazRepo.delete(id);
  }

  async findRegistrosByAsistencia(
    asistenciaId: string,
    query: ListRegistrosCasaPazQuery,
  ): Promise<PaginationResult<AdminRegistroAsistenciaCasaPazDto>> {
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
      data: data.map((item) => this.buildAdminRegistroAsistenciaResponse(item)),
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

    const sessionRows = await this.casaPazSesionRepo
      .createQueryBuilder('sesion')
      .select('sesion.fecha', 'fecha')
      .where('sesion.idAsistenciaCasaPazQr = :asistenciaId', { asistenciaId })
      .distinct(true)
      .orderBy('sesion.fecha', 'DESC')
      .getRawMany<{ fecha: string | Date }>();

    const fechas = new Set<string>();

    for (const row of rows) {
      fechas.add(normalizeAttendanceDateOrThrow(row.fechaRegistro));
    }

    for (const row of sessionRows) {
      fechas.add(normalizeAttendanceDateOrThrow(row.fecha));
    }

    return Array.from(fechas).sort((a, b) => b.localeCompare(a));
  }

  async findSesionByAsistencia(
    asistenciaId: string,
    fechaRaw: string,
  ): Promise<CasaPazSesionResponse> {
    await this.findOne(asistenciaId);

    const fecha = normalizeAttendanceDateOrThrow(
      fechaRaw,
      'La fecha de la sesión',
    );

    const sesion = await this.casaPazSesionRepo.findOneBy({
      idAsistenciaCasaPazQr: asistenciaId,
      fecha,
    });

    return {
      fecha,
      montoOfrenda: sesion?.montoOfrenda ?? 0,
      exists: Boolean(sesion),
    };
  }

  async upsertSesionByAsistencia(
    asistenciaId: string,
    payload: CasaPazSesionUpsertDto,
  ): Promise<CasaPazSesionResponse> {
    await this.findOne(asistenciaId);

    const fecha = normalizeAttendanceDateOrThrow(
      payload.fecha,
      'La fecha de la sesión',
    );
    const montoOfrenda = this.normalizeMontoOfrendaOrThrow(payload.montoOfrenda);

    const existing = await this.casaPazSesionRepo.findOneBy({
      idAsistenciaCasaPazQr: asistenciaId,
      fecha,
    });

    const sesion = existing
      ? this.casaPazSesionRepo.merge(existing, { montoOfrenda })
      : this.casaPazSesionRepo.create({
          idAsistenciaCasaPazQr: asistenciaId,
          fecha,
          montoOfrenda,
        });

    const saved = await this.casaPazSesionRepo.save(sesion);

    return {
      fecha: saved.fecha,
      montoOfrenda: saved.montoOfrenda,
      exists: true,
    };
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

  async getPublicByToken(token: string): Promise<PublicAsistenciaCasaPazDto> {
    const safeToken = sanitizeTokenOrThrow(token);
    const asistencia = await this.findPublicByTokenEntity(safeToken);

    return this.buildPublicAsistenciaResponse(asistencia);
  }

  async registrarPublico(
    token: string,
    payload: RegistrarAsistenciaPublicaCasaPazDto,
  ): Promise<PublicRegistrationCasaPazResponse> {
    const safeToken = sanitizeTokenOrThrow(token);
    const asistencia = await this.findPublicByTokenEntity(safeToken);

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
      const profileCompletion = this.buildProfileCompletion(persona, existente.esNuevo);
      return {
        alreadyRegistered: true,
        esNuevo: existente.esNuevo,
        needsProfileCompletion:
          profileCompletion.needsRed || profileCompletion.needsFechaNacimiento,
        profileCompletion,
        persona: this.buildPublicPersonaAttendance(persona),
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
      const profileCompletion = this.buildProfileCompletion(persona, esNuevo);
      return {
        alreadyRegistered: false,
        esNuevo,
        needsProfileCompletion:
          profileCompletion.needsRed || profileCompletion.needsFechaNacimiento,
        profileCompletion,
        persona: this.buildPublicPersonaAttendance(persona),
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
          const profileCompletion = this.buildProfileCompletion(
            persona,
            duplicated.esNuevo,
          );
          return {
            alreadyRegistered: true,
            esNuevo: duplicated.esNuevo,
            needsProfileCompletion:
              profileCompletion.needsRed || profileCompletion.needsFechaNacimiento,
            profileCompletion,
            persona: this.buildPublicPersonaAttendance(persona),
            registroId: duplicated.id,
            fechaRegistro,
          };
        }
      }

      throw error;
    }
  }

  async completePublicProfile(
    token: string,
    payload: CompletePublicProfileCasaPazDto,
  ): Promise<PublicPersonaAttendanceDto> {
    const safeToken = sanitizeTokenOrThrow(token);
    const asistencia = await this.findPublicByTokenEntity(safeToken);
    const personaId = sanitizeEntityIdOrThrow(payload.personaId, 'ID de persona');
    const documento = sanitizeDocumentoOrThrow(payload.documento);

    const persona = await this.personaRepo.findOne({
      where: { id: personaId, documento },
      relations: ['red', 'red.sede'],
    });

    if (!persona) {
      throw new NotFoundException('Persona no encontrada para completar el perfil');
    }

    const registro = await this.registroCasaPazRepo.findOneBy({
      idAsistencia: asistencia.id,
      idPersona: persona.id,
      fechaRegistro: this.getCurrentDateString(),
    });

    if (!registro) {
      throw new BadRequestException(
        'Primero debes registrar tu asistencia antes de completar el perfil',
      );
    }

    const updateData: Partial<Persona> = {};

    if (!this.hasAssignedRed(persona) && payload.idRed) {
      const idRed = sanitizeEntityIdOrThrow(payload.idRed, 'ID de red');
      await this.ensureRedExists(idRed);
      updateData.idRed = idRed;
    }

    if (!persona.fechaNacimiento && payload.fechaNacimiento) {
      updateData.fechaNacimiento = this.normalizeBirthDate(payload.fechaNacimiento);
    }

    if (Object.keys(updateData).length === 0) {
      return this.buildPublicPersonaAttendance(persona);
    }

    await this.personaRepo.update(persona.id, updateData);

    const updated = await this.personaRepo.findOne({
      where: { id: persona.id },
      relations: ['red', 'red.sede'],
    });

    if (!updated) {
      throw new NotFoundException('Persona no encontrada después de completar el perfil');
    }

    return this.buildPublicPersonaAttendance(updated);
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

  private buildProfileCompletion(
    persona: Persona,
    esNuevo: boolean,
  ): {
    needsRed: boolean;
    needsFechaNacimiento: boolean;
  } {
    if (esNuevo) {
      return { needsRed: false, needsFechaNacimiento: false };
    }

    return {
      needsRed: !this.hasAssignedRed(persona),
      needsFechaNacimiento: !persona.fechaNacimiento,
    };
  }

  private hasAssignedRed(persona: Persona): boolean {
    return Boolean(persona.idRed || persona.red?.id);
  }

  private normalizeBirthDate(value: string): string {
    const trimmed = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException('La fecha de nacimiento no tiene un formato válido');
    }

    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('La fecha de nacimiento no es válida');
    }

    return trimmed;
  }

  private async crearPersonaDesdeRegistro(
    documento: string,
    data: PersonaRegistroPublicoDto,
  ): Promise<Persona> {
    const { nombres, apellidos } = this.resolvePublicRegistrationName(data);

    if (!nombres || !data.celular?.trim()) {
      throw new BadRequestException(
        'Para registrar una persona nueva debes completar nombre y celular',
      );
    }

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
      encuentro: typeof data.encuentro === 'boolean' ? data.encuentro : null,
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

  private resolvePublicRegistrationName(
    data: PersonaRegistroPublicoDto,
  ): { nombres: string; apellidos: string | null } {
    const explicitNombres = data.nombres?.trim();
    const explicitApellidos = data.apellidos?.trim();

    if (explicitNombres) {
      return {
        nombres: sanitizeNombreOrThrow(explicitNombres, 'Nombres'),
        apellidos: explicitApellidos
          ? sanitizeNombreOrThrow(explicitApellidos, 'Apellidos')
          : null,
      };
    }

    const nombreCompleto = data.nombreCompleto?.trim();
    if (!nombreCompleto) {
      return { nombres: '', apellidos: null };
    }

    const parts = nombreCompleto.split(/\s+/).filter(Boolean);
    const nombres = parts[0] || '';
    const apellidos = parts.slice(1).join(' ');

    return {
      nombres: sanitizeNombreOrThrow(nombres, 'Nombre'),
      apellidos: apellidos ? sanitizeNombreOrThrow(apellidos, 'Apellidos') : null,
    };
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

  private async resolveRoleAssignments(
    payload: Pick<
      CreateAsistenciaCasaPazDto,
      'idPersonaACargo' | 'idAnfitrion' | 'idLiderPrincipal'
    >,
  ): Promise<{
    idPersonaACargo: string | null;
    idAnfitrion: string | null;
    idLiderPrincipal: string | null;
  }> {
    return {
      idPersonaACargo: await this.resolveRolePersonaId(
        payload.idPersonaACargo,
        'Persona a cargo',
      ),
      idAnfitrion: await this.resolveRolePersonaId(
        payload.idAnfitrion,
        'Anfitrión',
      ),
      idLiderPrincipal: await this.resolveRolePersonaId(
        payload.idLiderPrincipal,
        'Líder principal',
      ),
    };
  }

  private async resolveRolePersonaId(
    value: string | null | undefined,
    label: string,
  ): Promise<string | null> {
    if (value === undefined || value === null || value.trim() === '') {
      return null;
    }

    const personaId = sanitizeEntityIdOrThrow(value, `ID de ${label}`);
    await this.ensurePersonaExists(personaId, label);
    return personaId;
  }

  private async ensurePersonaExists(
    personaId: string,
    label: string,
  ): Promise<void> {
    const persona = await this.personaRepo.findOneBy({ id: personaId });

    if (!persona) {
      throw new NotFoundException(`${label} no existe`);
    }
  }

  private normalizeMontoOfrendaOrThrow(value: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException('El monto de ofrenda es inválido');
    }

    if (value < 0) {
      throw new BadRequestException('El monto de ofrenda no puede ser negativo');
    }

    return Number(value.toFixed(2));
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

    return map[getBogotaDayOfWeek(date)];
  }

  private getCurrentDateString(): string {
    return getBogotaDateString();
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

  private buildPublicAsistenciaResponse(
    asistencia: AsistenciaCasaPazQr,
  ): PublicAsistenciaCasaPazDto {
    return {
      nombre: asistencia.nombre,
      diaRegistro: asistencia.diaRegistro,
      estado: asistencia.estado,
      direccionCasa: asistencia.direccionCasa,
      red: asistencia.red
        ? {
            id: asistencia.red.id,
            nombre: asistencia.red.nombre ?? null,
          }
        : null,
      personaACargo: this.buildPublicPersonaRole(asistencia.personaACargo),
      anfitrion: this.buildPublicPersonaRole(asistencia.anfitrion),
      liderPrincipal: this.buildPublicPersonaRole(asistencia.liderPrincipal),
    };
  }

  private async findPublicByTokenEntity(
    safeToken: string,
  ): Promise<AsistenciaCasaPazQr> {
    const asistencia = await this.asistenciaCasaPazRepo.findOne({
      where: { qrToken: safeToken },
      relations: [...ASISTENCIA_ROLE_RELATIONS],
    });

    if (!asistencia) {
      throw new NotFoundException(
        'No se encontró una asistencia válida para este QR',
      );
    }

    return asistencia;
  }

  private async findOneEntity(id: string): Promise<AsistenciaCasaPazQr> {
    const safeId = sanitizeEntityIdOrThrow(id, 'ID de asistencia');

    const asistencia = await this.asistenciaCasaPazRepo.findOne({
      where: { id: safeId },
      relations: [...ASISTENCIA_ROLE_RELATIONS],
    });

    if (!asistencia) {
      throw new NotFoundException('Asistencia de casa de paz no encontrada');
    }

    return asistencia;
  }

  private buildAdminAsistenciaResponse(
    asistencia: AsistenciaCasaPazQr,
  ): AdminAsistenciaCasaPazDto {
    return {
      id: asistencia.id,
      nombre: asistencia.nombre,
      diaRegistro: asistencia.diaRegistro,
      estado: asistencia.estado,
      qrToken: asistencia.qrToken,
      idRed: asistencia.idRed,
      direccionCasa: asistencia.direccionCasa,
      idPersonaACargo: asistencia.idPersonaACargo ?? null,
      idAnfitrion: asistencia.idAnfitrion ?? null,
      idLiderPrincipal: asistencia.idLiderPrincipal ?? null,
      red: asistencia.red
        ? {
            id: asistencia.red.id,
            nombre: asistencia.red.nombre ?? null,
          }
        : null,
      personaACargo: this.buildAdminPersonaRole(asistencia.personaACargo),
      anfitrion: this.buildAdminPersonaRole(asistencia.anfitrion),
      liderPrincipal: this.buildAdminPersonaRole(asistencia.liderPrincipal),
    };
  }

  private buildAdminPersonaRole(
    persona: Persona | null | undefined,
  ): AdminPersonaRoleDto | null {
    if (!persona) {
      return null;
    }

    return {
      id: persona.id,
      nombres: persona.nombres ?? null,
      apellidos: persona.apellidos ?? null,
    };
  }

  private buildPublicPersonaRole(
    persona: Persona | null | undefined,
  ): PublicPersonaRoleDto | null {
    if (!persona) {
      return null;
    }

    return {
      nombres: persona.nombres ?? null,
      apellidos: persona.apellidos ?? null,
    };
  }

  private buildPublicPersonaAttendance(
    persona: Persona,
  ): PublicPersonaAttendanceDto {
    return {
      id: persona.id,
      nombres: persona.nombres ?? null,
      apellidos: persona.apellidos ?? null,
      fechaNacimiento: persona.fechaNacimiento ?? null,
      red: persona.red
        ? {
            id: persona.red.id,
            nombre: persona.red.nombre ?? null,
          }
        : null,
    };
  }

  private buildAdminRegistroAsistenciaResponse(
    registro: RegistroAsistenciaCasaPazQr,
  ): AdminRegistroAsistenciaCasaPazDto {
    return {
      id: registro.id,
      fechaRegistro: registro.fechaRegistro,
      esNuevo: registro.esNuevo,
      persona: registro.persona
        ? {
            id: registro.persona.id,
            nombres: registro.persona.nombres ?? null,
            apellidos: registro.persona.apellidos ?? null,
            documento: registro.persona.documento ?? null,
            celular: registro.persona.celular ?? null,
          }
        : null,
    };
  }
}
