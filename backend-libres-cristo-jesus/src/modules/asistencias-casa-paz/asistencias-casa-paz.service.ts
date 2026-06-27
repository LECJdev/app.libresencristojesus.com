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
  AuthenticatedUser,
  isScopedCasaDePazLeader,
} from '../../common/utils/role.util';
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

export interface CasaPazReportQuery {
  month?: string;
  fecha?: string;
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

export interface PublicCasaPazOfferingUpsertDto {
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

interface PublicCasaPazSesionResponse {
  fecha: string;
  montoOfrenda: number;
  exists: boolean;
}

interface AdminPersonaRoleDto {
  id: string;
  nombres: string | null;
  apellidos: string | null;
}

export interface PersonaRoleOptionDto {
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
  currentSession: PublicCasaPazSesionResponse;
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

interface CasaPazLinkReportItem {
  id: string;
  nombre: string;
  estado: EstadoAsistenciaCasaPaz;
  diaRegistro: DiaPredica;
  direccionCasa: string;
  redName: string | null;
  attendanceTotal: number;
  uniquePeopleReached: number;
  newPeopleTotal: number;
  sessionCount: number;
  offeringTotal: number;
  lastAttendanceDate: string | null;
}

interface CasaPazRedReportItem {
  idRed: string | null;
  nombreRed: string | null;
  attendanceTotal: number;
  uniquePeopleReached: number;
}

interface CasaPazDateReportItem {
  fecha: string;
  dayLabel: string;
  attendanceTotal: number;
  uniquePeopleReached: number;
  newPeopleTotal: number;
  sessionCount: number;
  offeringTotal: number;
}

interface CasaPazEncounterCandidateItem {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  documento: string | null;
  celular: string | null;
  encuentro: boolean | null;
  redName: string | null;
  attendanceCount: number;
  firstAttendanceDate: string | null;
  lastAttendanceDate: string | null;
  linksCount: number;
}

interface CasaPazReportSummaryMetrics {
  activeLinks: number;
  totalLinks: number;
  linksWithAttendance: number;
  attendanceTotal: number;
  uniquePeopleReached: number;
  newPeopleTotal: number;
  sessionCount: number;
  offeringTotal: number;
  possibleEncounterCandidates: number;
}

interface CasaPazScopedLinkInfo {
  id: string;
  nombre: string;
  estado: EstadoAsistenciaCasaPaz;
  diaRegistro: DiaPredica;
  direccionCasa: string;
  redName: string | null;
}

export interface CasaPazReportResponse {
  generatedAt: string;
  scope: 'global' | 'scoped' | 'link';
  filters: {
    month: string | null;
    fecha: string | null;
    asistenciaId: string | null;
  };
  summary: CasaPazReportSummaryMetrics;
  scopedLinks: CasaPazScopedLinkInfo[];
  attendanceByLink: CasaPazLinkReportItem[];
  attendanceByRed: CasaPazRedReportItem[];
  attendanceByDate: CasaPazDateReportItem[];
  encounterCandidates: CasaPazEncounterCandidateItem[];
}

export interface CasaPazEncounterCandidatesReportResponse {
  generatedAt: string;
  filters: {
    month: string | null;
    fecha: string | null;
  };
  total: number;
  candidates: CasaPazEncounterCandidateItem[];
}

interface CasaPazReportFilters {
  month?: string;
  fecha?: string;
  asistenciaId?: string;
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
    user: AuthenticatedUser,
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

    this.applyOwnershipScope(qb, user);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((item) => this.buildAdminAsistenciaResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AdminAsistenciaCasaPazDto> {
    const asistencia = await this.findOneEntity(id, user);
    return this.buildAdminAsistenciaResponse(asistencia);
  }

  async findPersonaRoleOptions(): Promise<PersonaRoleOptionDto[]> {
    const personas = await this.personaRepo
      .createQueryBuilder('persona')
      .select([
        'persona.id AS id',
        'persona.nombres AS nombres',
        'persona.apellidos AS apellidos',
      ])
      .orderBy('persona.nombres', 'ASC')
      .addOrderBy('persona.apellidos', 'ASC')
      .getRawMany<PersonaRoleOptionDto>();

    return personas.map((persona) => ({
      id: persona.id,
      nombres: persona.nombres ?? null,
      apellidos: persona.apellidos ?? null,
    }));
  }

  async findGeneralReport(
    user: AuthenticatedUser,
  ): Promise<CasaPazReportResponse> {
    return this.buildCasaPazReport({}, user);
  }

  async findMonthlyReport(
    monthRaw: string | undefined,
    user: AuthenticatedUser,
  ): Promise<CasaPazReportResponse> {
    const month = this.normalizeMonthOrThrow(monthRaw);
    return this.buildCasaPazReport({ month }, user);
  }

  async findDailyReport(
    fechaRaw: string | undefined,
    user: AuthenticatedUser,
  ): Promise<CasaPazReportResponse> {
    const fecha = normalizeAttendanceDateOrThrow(fechaRaw, 'The report date');
    return this.buildCasaPazReport({ fecha }, user);
  }

  async findDetailReport(
    asistenciaId: string,
    query: CasaPazReportQuery,
    user: AuthenticatedUser,
  ): Promise<CasaPazReportResponse> {
    const filters: CasaPazReportFilters = { asistenciaId };

    if (query.month) {
      filters.month = this.normalizeMonthOrThrow(query.month);
    }

    if (query.fecha) {
      filters.fecha = normalizeAttendanceDateOrThrow(
        query.fecha,
        'The report date',
      );
    }

    return this.buildCasaPazReport(filters, user);
  }

  async findEncounterCandidatesReport(
    query: CasaPazReportQuery,
    user: AuthenticatedUser,
  ): Promise<CasaPazEncounterCandidatesReportResponse> {
    const filters: CasaPazReportFilters = {};

    if (query.month) {
      filters.month = this.normalizeMonthOrThrow(query.month);
    }

    if (query.fecha) {
      filters.fecha = normalizeAttendanceDateOrThrow(
        query.fecha,
        'The report date',
      );
    }

    const report = await this.buildCasaPazReport(filters, user);

    return {
      generatedAt: report.generatedAt,
      filters: {
        month: report.filters.month,
        fecha: report.filters.fecha,
      },
      total: report.encounterCandidates.length,
      candidates: report.encounterCandidates,
    };
  }

  async create(
    payload: CreateAsistenciaCasaPazDto,
    user: AuthenticatedUser,
  ): Promise<AdminAsistenciaCasaPazDto> {
    const idRed = sanitizeEntityIdOrThrow(payload.idRed, 'ID de red');
    const direccionCasa = sanitizeRequiredTextOrThrow(
      payload.direccionCasa,
      'Dirección de casa',
      255,
    );

    await this.ensureRedExists(idRed);
    const roles = await this.resolveRoleAssignments(payload, user);

    const entity = this.asistenciaCasaPazRepo.create({
      nombre: sanitizeRequiredTextOrThrow(payload.nombre, 'Nombre', 150),
      diaRegistro: payload.diaRegistro,
      estado: payload.estado ?? EstadoAsistenciaCasaPaz.ACTIVO,
      idRed,
      direccionCasa,
      ...roles,
    });

    this.ensureLeaderAssignment(entity.idLiderPrincipal);

    const saved = await this.asistenciaCasaPazRepo.save(entity);
    return this.findOne(saved.id, user);
  }

  async update(
    id: string,
    payload: UpdateAsistenciaCasaPazDto,
    user: AuthenticatedUser,
  ): Promise<AdminAsistenciaCasaPazDto> {
    const asistencia = await this.findOneEntity(id, user);
    const originalLeaderId = asistencia.idLiderPrincipal;

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
        'Person in charge',
      );
    }

    if (payload.idAnfitrion !== undefined) {
      asistencia.idAnfitrion = await this.resolveRolePersonaId(
        payload.idAnfitrion,
        'Host',
      );
    }

    if (
      payload.idLiderPrincipal !== undefined &&
      !isScopedCasaDePazLeader(user)
    ) {
      asistencia.idLiderPrincipal = await this.resolveRolePersonaId(
        payload.idLiderPrincipal,
        'Main leader',
      );
    }

    if (isScopedCasaDePazLeader(user)) {
      asistencia.idLiderPrincipal = originalLeaderId;
    }

    this.ensureLeaderAssignment(asistencia.idLiderPrincipal);

    await this.asistenciaCasaPazRepo.save(
      this.stripLoadedAsistenciaRelations(asistencia),
    );
    return this.findOne(asistencia.id, user);
  }

  async setEstado(
    id: string,
    estado: EstadoAsistenciaCasaPaz,
    user: AuthenticatedUser,
  ): Promise<AdminAsistenciaCasaPazDto> {
    const asistencia = await this.findOneEntity(id, user);
    asistencia.estado = estado;
    await this.asistenciaCasaPazRepo.save(
      this.stripLoadedAsistenciaRelations(asistencia),
    );
    return this.findOne(asistencia.id, user);
  }

  async remove(id: string): Promise<void> {
    const safeId = sanitizeEntityIdOrThrow(id, 'ID de asistencia');
    const asistencia = await this.asistenciaCasaPazRepo.findOneBy({
      id: safeId,
    });

    if (!asistencia) {
      throw new NotFoundException('Asistencia de casa de paz no encontrada');
    }

    await this.asistenciaCasaPazRepo.delete(safeId);
  }

  async findRegistrosByAsistencia(
    asistenciaId: string,
    query: ListRegistrosCasaPazQuery,
    user: AuthenticatedUser,
  ): Promise<PaginationResult<AdminRegistroAsistenciaCasaPazDto>> {
    const scopedAsistenciaId = await this.resolveScopedAsistenciaId(
      asistenciaId,
      user,
    );

    const { page, limit } = this.getPagination(query.page, query.limit);
    const fecha = this.normalizeFechaFiltro(query.fecha);

    const qb = this.registroCasaPazRepo
      .createQueryBuilder('registro')
      .leftJoinAndSelect('registro.persona', 'persona')
      .where('registro.idAsistencia = :asistenciaId', {
        asistenciaId: scopedAsistenciaId,
      })
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
    user: AuthenticatedUser,
  ): Promise<string[]> {
    const scopedAsistenciaId = await this.resolveScopedAsistenciaId(
      asistenciaId,
      user,
    );

    const rows = await this.registroCasaPazRepo
      .createQueryBuilder('registro')
      .select('registro.fechaRegistro', 'fechaRegistro')
      .where('registro.idAsistencia = :asistenciaId', {
        asistenciaId: scopedAsistenciaId,
      })
      .distinct(true)
      .orderBy('registro.fechaRegistro', 'DESC')
      .getRawMany<{ fechaRegistro: string | Date }>();

    const sessionRows = await this.casaPazSesionRepo
      .createQueryBuilder('sesion')
      .select('sesion.fecha', 'fecha')
      .where('sesion.idAsistenciaCasaPazQr = :asistenciaId', {
        asistenciaId: scopedAsistenciaId,
      })
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
    user: AuthenticatedUser,
  ): Promise<CasaPazSesionResponse> {
    const scopedAsistenciaId = await this.resolveScopedAsistenciaId(
      asistenciaId,
      user,
    );

    const fecha = normalizeAttendanceDateOrThrow(
      fechaRaw,
      'La fecha de la sesión',
    );

    const sesion = await this.casaPazSesionRepo.findOneBy({
      idAsistenciaCasaPazQr: scopedAsistenciaId,
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
    user: AuthenticatedUser,
  ): Promise<CasaPazSesionResponse> {
    const scopedAsistenciaId = await this.resolveScopedAsistenciaId(
      asistenciaId,
      user,
    );

    const fecha = normalizeAttendanceDateOrThrow(
      payload.fecha,
      'La fecha de la sesión',
    );

    const existing = await this.casaPazSesionRepo.findOneBy({
      idAsistenciaCasaPazQr: scopedAsistenciaId,
      fecha,
    });

    const montoOfrenda = this.normalizeMontoOfrendaOrThrow(
      payload.montoOfrenda,
    );

    const sesion = existing
      ? this.casaPazSesionRepo.merge(existing, { montoOfrenda })
      : this.casaPazSesionRepo.create({
          idAsistenciaCasaPazQr: scopedAsistenciaId,
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
    user: AuthenticatedUser,
  ): Promise<AttendanceDateSummary> {
    const scopedAsistenciaId = await this.resolveScopedAsistenciaId(
      asistenciaId,
      user,
    );

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
      .where('registro.idAsistencia = :asistenciaId', {
        asistenciaId: scopedAsistenciaId,
      })
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
    user: AuthenticatedUser,
  ): Promise<AttendanceRedSummary[]> {
    const scopedAsistenciaId = await this.resolveScopedAsistenciaId(
      asistenciaId,
      user,
    );

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
      .where('registro.idAsistencia = :asistenciaId', {
        asistenciaId: scopedAsistenciaId,
      })
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

    return await this.buildPublicAsistenciaResponse(asistencia);
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
      const profileCompletion = this.buildProfileCompletion(
        persona,
        existente.esNuevo,
      );
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
              profileCompletion.needsRed ||
              profileCompletion.needsFechaNacimiento,
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
    const personaId = sanitizeEntityIdOrThrow(
      payload.personaId,
      'ID de persona',
    );
    const documento = sanitizeDocumentoOrThrow(payload.documento);

    const persona = await this.personaRepo.findOne({
      where: { id: personaId, documento },
      relations: ['red', 'red.sede'],
    });

    if (!persona) {
      throw new NotFoundException(
        'Persona no encontrada para completar el perfil',
      );
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
      updateData.fechaNacimiento = this.normalizeBirthDate(
        payload.fechaNacimiento,
      );
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
      throw new NotFoundException(
        'Persona no encontrada después de completar el perfil',
      );
    }

    return this.buildPublicPersonaAttendance(updated);
  }

  private async ensureRedExists(idRed: string): Promise<void> {
    const red = await this.redRepo.findOneBy({ id: idRed });
    if (!red) {
      throw new NotFoundException('La red seleccionada no existe');
    }
  }

  async upsertPublicOffering(
    token: string,
    payload: PublicCasaPazOfferingUpsertDto,
  ): Promise<PublicCasaPazSesionResponse> {
    const safeToken = sanitizeTokenOrThrow(token);
    const asistencia = await this.findPublicByTokenEntity(safeToken);

    if (asistencia.estado !== EstadoAsistenciaCasaPaz.ACTIVO) {
      throw new BadRequestException('Esta asistencia se encuentra inactiva');
    }

    const fecha = this.getCurrentDateString();
    const existing = await this.casaPazSesionRepo.findOneBy({
      idAsistenciaCasaPazQr: asistencia.id,
      fecha,
    });
    const montoOfrenda = this.normalizeMontoOfrendaOrThrow(
      payload.montoOfrenda,
    );

    const sesion = existing
      ? this.casaPazSesionRepo.merge(existing, { montoOfrenda })
      : this.casaPazSesionRepo.create({
          idAsistenciaCasaPazQr: asistencia.id,
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
      throw new BadRequestException(
        'La fecha de nacimiento no tiene un formato válido',
      );
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

  private resolvePublicRegistrationName(data: PersonaRegistroPublicoDto): {
    nombres: string;
    apellidos: string | null;
  } {
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
      apellidos: apellidos
        ? sanitizeNombreOrThrow(apellidos, 'Apellidos')
        : null,
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
    user: AuthenticatedUser,
  ): Promise<{
    idPersonaACargo: string | null;
    idAnfitrion: string | null;
    idLiderPrincipal: string | null;
  }> {
    if (isScopedCasaDePazLeader(user)) {
      return {
        idPersonaACargo: await this.resolveRolePersonaId(
          payload.idPersonaACargo,
          'Person in charge',
        ),
        idAnfitrion: await this.resolveRolePersonaId(
          payload.idAnfitrion,
          'Host',
        ),
        idLiderPrincipal: user.id,
      };
    }

    return {
      idPersonaACargo: await this.resolveRolePersonaId(
        payload.idPersonaACargo,
        'Person in charge',
      ),
      idAnfitrion: await this.resolveRolePersonaId(payload.idAnfitrion, 'Host'),
      idLiderPrincipal: await this.resolveRolePersonaId(
        payload.idLiderPrincipal,
        'Main leader',
      ),
    };
  }

  private async buildCasaPazReport(
    filters: CasaPazReportFilters,
    user: AuthenticatedUser,
  ): Promise<CasaPazReportResponse> {
    const normalizedFilters = this.normalizeReportFilters(filters);
    const scopedLinks = await this.findScopedLinksForReport(
      normalizedFilters,
      user,
    );
    const asistenciaIds = scopedLinks.map((item) => item.id);

    if (asistenciaIds.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        scope: this.resolveReportScope(user, normalizedFilters.asistenciaId),
        filters: {
          month: normalizedFilters.month ?? null,
          fecha: normalizedFilters.fecha ?? null,
          asistenciaId: normalizedFilters.asistenciaId ?? null,
        },
        summary: {
          activeLinks: 0,
          totalLinks: 0,
          linksWithAttendance: 0,
          attendanceTotal: 0,
          uniquePeopleReached: 0,
          newPeopleTotal: 0,
          sessionCount: 0,
          offeringTotal: 0,
          possibleEncounterCandidates: 0,
        },
        scopedLinks: [],
        attendanceByLink: [],
        attendanceByRed: [],
        attendanceByDate: [],
        encounterCandidates: [],
      };
    }

    const attendanceTotalsRaw = await this.createRegistroReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .select('COUNT(*)', 'attendanceTotal')
      .addSelect('COUNT(DISTINCT registro.idPersona)', 'uniquePeopleReached')
      .addSelect(
        'COALESCE(SUM(CASE WHEN registro.esNuevo = true THEN 1 ELSE 0 END), 0)',
        'newPeopleTotal',
      )
      .getRawOne<{
        attendanceTotal: string;
        uniquePeopleReached: string;
        newPeopleTotal: string;
      }>();

    const attendanceByLinkRaw = await this.createRegistroReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .select('asistencia.id', 'id')
      .addSelect('asistencia.nombre', 'nombre')
      .addSelect('asistencia.estado', 'estado')
      .addSelect('asistencia.diaRegistro', 'diaRegistro')
      .addSelect('asistencia.direccionCasa', 'direccionCasa')
      .addSelect('red.nombre', 'redName')
      .addSelect('COUNT(*)', 'attendanceTotal')
      .addSelect('COUNT(DISTINCT registro.idPersona)', 'uniquePeopleReached')
      .addSelect(
        'COALESCE(SUM(CASE WHEN registro.esNuevo = true THEN 1 ELSE 0 END), 0)',
        'newPeopleTotal',
      )
      .addSelect('MAX(registro.fechaRegistro)', 'lastAttendanceDate')
      .groupBy('asistencia.id')
      .addGroupBy('asistencia.nombre')
      .addGroupBy('asistencia.estado')
      .addGroupBy('asistencia.diaRegistro')
      .addGroupBy('asistencia.direccionCasa')
      .addGroupBy('red.nombre')
      .orderBy('COUNT(*)', 'DESC')
      .addOrderBy('asistencia.nombre', 'ASC')
      .getRawMany<{
        id: string;
        nombre: string;
        estado: EstadoAsistenciaCasaPaz;
        diaRegistro: DiaPredica;
        direccionCasa: string;
        redName: string | null;
        attendanceTotal: string;
        uniquePeopleReached: string;
        newPeopleTotal: string;
        lastAttendanceDate: string | Date | null;
      }>();

    const attendanceByRedRaw = await this.createRegistroReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .select('persona.red_id', 'idRed')
      .addSelect('personaRed.nombre', 'nombreRed')
      .addSelect('COUNT(*)', 'attendanceTotal')
      .addSelect('COUNT(DISTINCT registro.idPersona)', 'uniquePeopleReached')
      .groupBy('persona.red_id')
      .addGroupBy('personaRed.nombre')
      .orderBy('COUNT(*)', 'DESC')
      .addOrderBy('personaRed.nombre', 'ASC')
      .getRawMany<{
        idRed: string | null;
        nombreRed: string | null;
        attendanceTotal: string;
        uniquePeopleReached: string;
      }>();

    const attendanceByDateRaw = await this.createRegistroReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .select('registro.fechaRegistro', 'fecha')
      .addSelect('COUNT(*)', 'attendanceTotal')
      .addSelect('COUNT(DISTINCT registro.idPersona)', 'uniquePeopleReached')
      .addSelect(
        'COALESCE(SUM(CASE WHEN registro.esNuevo = true THEN 1 ELSE 0 END), 0)',
        'newPeopleTotal',
      )
      .groupBy('registro.fechaRegistro')
      .orderBy('registro.fechaRegistro', 'DESC')
      .getRawMany<{
        fecha: string | Date;
        attendanceTotal: string;
        uniquePeopleReached: string;
        newPeopleTotal: string;
      }>();

    const sessionTotalsRaw = await this.createSesionReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .select('COUNT(*)', 'sessionCount')
      .addSelect('COALESCE(SUM(sesion.montoOfrenda), 0)', 'offeringTotal')
      .getRawOne<{
        sessionCount: string;
        offeringTotal: string;
      }>();

    const sessionsByLinkRaw = await this.createSesionReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .select('asistencia.id', 'id')
      .addSelect('COUNT(*)', 'sessionCount')
      .addSelect('COALESCE(SUM(sesion.montoOfrenda), 0)', 'offeringTotal')
      .groupBy('asistencia.id')
      .getRawMany<{
        id: string;
        sessionCount: string;
        offeringTotal: string;
      }>();

    const sessionsByDateRaw = await this.createSesionReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .select('sesion.fecha', 'fecha')
      .addSelect('COUNT(*)', 'sessionCount')
      .addSelect('COALESCE(SUM(sesion.montoOfrenda), 0)', 'offeringTotal')
      .groupBy('sesion.fecha')
      .orderBy('sesion.fecha', 'DESC')
      .getRawMany<{
        fecha: string | Date;
        sessionCount: string;
        offeringTotal: string;
      }>();

    const encounterCandidatesRaw = await this.createRegistroReportQuery(
      asistenciaIds,
      normalizedFilters,
    )
      .andWhere('(persona.encuentro = false OR persona.encuentro IS NULL)')
      .select('persona.id', 'id')
      .addSelect('persona.nombres', 'nombres')
      .addSelect('persona.apellidos', 'apellidos')
      .addSelect('persona.documento', 'documento')
      .addSelect('persona.celular', 'celular')
      .addSelect('persona.encuentro', 'encuentro')
      .addSelect('personaRed.nombre', 'redName')
      .addSelect('COUNT(*)', 'attendanceCount')
      .addSelect('MIN(registro.fechaRegistro)', 'firstAttendanceDate')
      .addSelect('MAX(registro.fechaRegistro)', 'lastAttendanceDate')
      .addSelect('COUNT(DISTINCT asistencia.id)', 'linksCount')
      .groupBy('persona.id')
      .addGroupBy('persona.nombres')
      .addGroupBy('persona.apellidos')
      .addGroupBy('persona.documento')
      .addGroupBy('persona.celular')
      .addGroupBy('persona.encuentro')
      .addGroupBy('personaRed.nombre')
      .orderBy('MAX(registro.fechaRegistro)', 'DESC')
      .addOrderBy('COUNT(*)', 'DESC')
      .addOrderBy('persona.nombres', 'ASC')
      .getRawMany<{
        id: string;
        nombres: string | null;
        apellidos: string | null;
        documento: string | null;
        celular: string | null;
        encuentro: boolean | null;
        redName: string | null;
        attendanceCount: string;
        firstAttendanceDate: string | Date | null;
        lastAttendanceDate: string | Date | null;
        linksCount: string;
      }>();

    const sessionsByLinkMap = new Map(
      sessionsByLinkRaw.map((item) => [
        item.id,
        {
          sessionCount: Number(item.sessionCount ?? 0),
          offeringTotal: Number(item.offeringTotal ?? 0),
        },
      ]),
    );
    const sessionsByDateMap = new Map(
      sessionsByDateRaw.flatMap((item) => {
        const fecha = this.normalizeReportDateValue(item.fecha);

        if (!fecha) {
          return [];
        }

        return [
          [
            fecha,
            {
              sessionCount: Number(item.sessionCount ?? 0),
              offeringTotal: Number(item.offeringTotal ?? 0),
            },
          ] as const,
        ];
      }),
    );
    const attendanceByLinkMap = new Map(
      attendanceByLinkRaw.map((item) => [item.id, item]),
    );
    const attendanceByDateMap = new Map(
      attendanceByDateRaw.flatMap((item) => {
        const fecha = this.normalizeReportDateValue(item.fecha);

        if (!fecha) {
          return [];
        }

        return [[fecha, { ...item, fecha }] as const];
      }),
    );

    const attendanceByLink = scopedLinks
      .map((link) => {
        const attendance = attendanceByLinkMap.get(link.id);
        const session = sessionsByLinkMap.get(link.id);

        return {
          id: link.id,
          nombre: link.nombre,
          estado: link.estado,
          diaRegistro: link.diaRegistro,
          direccionCasa: link.direccionCasa,
          redName: link.redName,
          attendanceTotal: Number(attendance?.attendanceTotal ?? 0),
          uniquePeopleReached: Number(attendance?.uniquePeopleReached ?? 0),
          newPeopleTotal: Number(attendance?.newPeopleTotal ?? 0),
          sessionCount: session?.sessionCount ?? 0,
          offeringTotal: session?.offeringTotal ?? 0,
          lastAttendanceDate:
            this.normalizeReportDateValue(attendance?.lastAttendanceDate) ??
            null,
        } satisfies CasaPazLinkReportItem;
      })
      .sort((left, right) => {
        if (right.attendanceTotal !== left.attendanceTotal) {
          return right.attendanceTotal - left.attendanceTotal;
        }

        return left.nombre.localeCompare(right.nombre);
      });

    const attendanceDates = new Set<string>([
      ...this.collectNormalizedReportDates(
        attendanceByDateRaw.map((item) => item.fecha),
      ),
      ...this.collectNormalizedReportDates(
        sessionsByDateRaw.map((item) => item.fecha),
      ),
    ]);

    const attendanceByDate = Array.from(attendanceDates)
      .sort((left, right) => right.localeCompare(left))
      .map((fecha) => {
        const attendance = attendanceByDateMap.get(fecha);
        const session = sessionsByDateMap.get(fecha);

        return {
          fecha,
          dayLabel: this.buildDayLabel(fecha),
          attendanceTotal: Number(attendance?.attendanceTotal ?? 0),
          uniquePeopleReached: Number(attendance?.uniquePeopleReached ?? 0),
          newPeopleTotal: Number(attendance?.newPeopleTotal ?? 0),
          sessionCount: session?.sessionCount ?? 0,
          offeringTotal: session?.offeringTotal ?? 0,
        } satisfies CasaPazDateReportItem;
      });

    const encounterCandidates = encounterCandidatesRaw.map((item) => ({
      id: item.id,
      nombres: item.nombres ?? null,
      apellidos: item.apellidos ?? null,
      documento: item.documento ?? null,
      celular: item.celular ?? null,
      encuentro: item.encuentro ?? null,
      redName: item.redName ?? null,
      attendanceCount: Number(item.attendanceCount ?? 0),
      firstAttendanceDate:
        this.normalizeReportDateValue(item.firstAttendanceDate) ?? null,
      lastAttendanceDate:
        this.normalizeReportDateValue(item.lastAttendanceDate) ?? null,
      linksCount: Number(item.linksCount ?? 0),
    }));

    return {
      generatedAt: new Date().toISOString(),
      scope: this.resolveReportScope(user, normalizedFilters.asistenciaId),
      filters: {
        month: normalizedFilters.month ?? null,
        fecha: normalizedFilters.fecha ?? null,
        asistenciaId: normalizedFilters.asistenciaId ?? null,
      },
      summary: {
        activeLinks: scopedLinks.filter(
          (item) => item.estado === EstadoAsistenciaCasaPaz.ACTIVO,
        ).length,
        totalLinks: scopedLinks.length,
        linksWithAttendance: attendanceByLink.filter(
          (item) => item.attendanceTotal > 0,
        ).length,
        attendanceTotal: Number(attendanceTotalsRaw?.attendanceTotal ?? 0),
        uniquePeopleReached: Number(
          attendanceTotalsRaw?.uniquePeopleReached ?? 0,
        ),
        newPeopleTotal: Number(attendanceTotalsRaw?.newPeopleTotal ?? 0),
        sessionCount: Number(sessionTotalsRaw?.sessionCount ?? 0),
        offeringTotal: Number(sessionTotalsRaw?.offeringTotal ?? 0),
        possibleEncounterCandidates: encounterCandidates.length,
      },
      scopedLinks,
      attendanceByLink,
      attendanceByRed: attendanceByRedRaw.map((item) => ({
        idRed: item.idRed ?? null,
        nombreRed: item.nombreRed ?? null,
        attendanceTotal: Number(item.attendanceTotal ?? 0),
        uniquePeopleReached: Number(item.uniquePeopleReached ?? 0),
      })),
      attendanceByDate,
      encounterCandidates,
    };
  }

  private normalizeReportFilters(
    filters: CasaPazReportFilters,
  ): CasaPazReportFilters {
    const normalized: CasaPazReportFilters = {};

    if (filters.asistenciaId) {
      normalized.asistenciaId = sanitizeEntityIdOrThrow(
        filters.asistenciaId,
        'Attendance ID',
      );
    }

    if (filters.month) {
      normalized.month = this.normalizeMonthOrThrow(filters.month);
    }

    if (filters.fecha) {
      normalized.fecha = normalizeAttendanceDateOrThrow(
        filters.fecha,
        'The report date',
      );
    }

    if (normalized.month && normalized.fecha) {
      throw new BadRequestException(
        'Month and date filters cannot be combined in the same report request',
      );
    }

    return normalized;
  }

  private async findScopedLinksForReport(
    filters: CasaPazReportFilters,
    user: AuthenticatedUser,
  ): Promise<CasaPazScopedLinkInfo[]> {
    const qb = this.asistenciaCasaPazRepo
      .createQueryBuilder('asistencia')
      .leftJoin('asistencia.red', 'red')
      .select('asistencia.id', 'id')
      .addSelect('asistencia.nombre', 'nombre')
      .addSelect('asistencia.estado', 'estado')
      .addSelect('asistencia.diaRegistro', 'diaRegistro')
      .addSelect('asistencia.direccionCasa', 'direccionCasa')
      .addSelect('red.nombre', 'redName')
      .orderBy('asistencia.nombre', 'ASC');

    this.applyOwnershipScope(qb, user);

    if (filters.asistenciaId) {
      qb.andWhere('asistencia.id = :asistenciaId', {
        asistenciaId: filters.asistenciaId,
      });
    }

    const scopedLinks = await qb.getRawMany<CasaPazScopedLinkInfo>();

    if (filters.asistenciaId && scopedLinks.length === 0) {
      await this.findOneEntity(filters.asistenciaId, user);
    }

    return scopedLinks.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      estado: item.estado,
      diaRegistro: item.diaRegistro,
      direccionCasa: item.direccionCasa,
      redName: item.redName ?? null,
    }));
  }

  private createRegistroReportQuery(
    asistenciaIds: string[],
    filters: CasaPazReportFilters,
  ) {
    const qb = this.registroCasaPazRepo
      .createQueryBuilder('registro')
      .innerJoin('registro.asistencia', 'asistencia')
      .leftJoin('asistencia.red', 'red')
      .leftJoin('registro.persona', 'persona')
      .leftJoin('persona.red', 'personaRed')
      .where('registro.idAsistencia IN (:...asistenciaIds)', { asistenciaIds });

    this.applyRegistroDateFilters(qb, filters);
    return qb;
  }

  private createSesionReportQuery(
    asistenciaIds: string[],
    filters: CasaPazReportFilters,
  ) {
    const qb = this.casaPazSesionRepo
      .createQueryBuilder('sesion')
      .innerJoin('sesion.asistencia', 'asistencia')
      .where('sesion.idAsistenciaCasaPazQr IN (:...asistenciaIds)', {
        asistenciaIds,
      });

    this.applySesionDateFilters(qb, filters);
    return qb;
  }

  private applyRegistroDateFilters(
    qb: {
      andWhere: (
        query: string,
        parameters?: Record<string, unknown>,
      ) => unknown;
    },
    filters: CasaPazReportFilters,
  ) {
    if (filters.fecha) {
      qb.andWhere('registro.fechaRegistro = :fecha', { fecha: filters.fecha });
      return;
    }

    if (filters.month) {
      const range = this.buildMonthRange(filters.month);
      qb.andWhere(
        'registro.fechaRegistro >= :startDate AND registro.fechaRegistro < :endDate',
        range,
      );
    }
  }

  private applySesionDateFilters(
    qb: {
      andWhere: (
        query: string,
        parameters?: Record<string, unknown>,
      ) => unknown;
    },
    filters: CasaPazReportFilters,
  ) {
    if (filters.fecha) {
      qb.andWhere('sesion.fecha = :fecha', { fecha: filters.fecha });
      return;
    }

    if (filters.month) {
      const range = this.buildMonthRange(filters.month);
      qb.andWhere(
        'sesion.fecha >= :startDate AND sesion.fecha < :endDate',
        range,
      );
    }
  }

  private normalizeMonthOrThrow(monthRaw?: string): string {
    if (!monthRaw) {
      throw new BadRequestException('The month query parameter is required');
    }

    const trimmed = monthRaw.trim();
    const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
    if (!match) {
      throw new BadRequestException('The month must use the YYYY-MM format');
    }

    const month = Number(match[2]);
    if (month < 1 || month > 12) {
      throw new BadRequestException('The month value is invalid');
    }

    return trimmed;
  }

  private buildMonthRange(month: string): {
    startDate: string;
    endDate: string;
  } {
    const [yearRaw, monthRaw] = month.split('-');
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1));

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  private buildDayLabel(fecha: string): string {
    const normalizedDate =
      this.normalizeReportDateValue(fecha) ??
      normalizeAttendanceDateOrThrow(fecha, 'The report date');

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${normalizedDate}T00:00:00.000Z`));
  }

  private normalizeReportDateValue(
    value: string | Date | null | undefined,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      return normalizeAttendanceDateOrThrow(value, 'The report date');
    } catch {
      return null;
    }
  }

  private collectNormalizedReportDates(
    values: Array<string | Date | null | undefined>,
  ): string[] {
    return values.flatMap((value) => {
      const normalized = this.normalizeReportDateValue(value);
      return normalized ? [normalized] : [];
    });
  }

  private resolveReportScope(
    user: AuthenticatedUser,
    asistenciaId?: string,
  ): 'global' | 'scoped' | 'link' {
    if (asistenciaId) {
      return 'link';
    }

    return isScopedCasaDePazLeader(user) ? 'scoped' : 'global';
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

  private ensureLeaderAssignment(leaderPersonaId: string | null) {
    if (!leaderPersonaId) {
      throw new BadRequestException('Casa de Paz leader is required');
    }
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
    return this.normalizeSessionAmountOrThrow(value, 'offering amount');
  }

  private normalizeSessionAmountOrThrow(value: number, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(`The ${label} is invalid`);
    }

    if (value < 0) {
      throw new BadRequestException(`The ${label} cannot be negative`);
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

  private async buildPublicAsistenciaResponse(
    asistencia: AsistenciaCasaPazQr,
  ): Promise<PublicAsistenciaCasaPazDto> {
    const currentDate = this.getCurrentDateString();
    const currentSession = await this.casaPazSesionRepo.findOneBy({
      idAsistenciaCasaPazQr: asistencia.id,
      fecha: currentDate,
    });

    return {
      nombre: asistencia.nombre,
      diaRegistro: asistencia.diaRegistro,
      estado: asistencia.estado,
      direccionCasa: asistencia.direccionCasa,
      currentSession: {
        fecha: currentDate,
        montoOfrenda: currentSession?.montoOfrenda ?? 0,
        exists: Boolean(currentSession),
      },
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

  private async findOneEntity(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AsistenciaCasaPazQr> {
    const safeId = sanitizeEntityIdOrThrow(id, 'ID de asistencia');

    const asistencia = await this.asistenciaCasaPazRepo.findOne({
      where: this.buildScopedAsistenciaWhere(safeId, user),
      relations: [...ASISTENCIA_ROLE_RELATIONS],
    });

    if (!asistencia) {
      throw new NotFoundException('Asistencia de casa de paz no encontrada');
    }

    return asistencia;
  }

  private async resolveScopedAsistenciaId(
    id: string,
    user: AuthenticatedUser,
  ): Promise<string> {
    const asistencia = await this.findOneEntity(id, user);
    return asistencia.id;
  }

  private buildScopedAsistenciaWhere(id: string, user: AuthenticatedUser) {
    if (!isScopedCasaDePazLeader(user)) {
      return { id };
    }

    return [
      { id, idPersonaACargo: user.id },
      { id, idLiderPrincipal: user.id },
    ];
  }

  private applyOwnershipScope(
    qb: {
      andWhere: (
        query: string,
        parameters?: Record<string, unknown>,
      ) => unknown;
    },
    user: AuthenticatedUser,
  ) {
    if (!isScopedCasaDePazLeader(user)) {
      return;
    }

    qb.andWhere(
      '(asistencia.idPersonaACargo = :currentUserId OR asistencia.idLiderPrincipal = :currentUserId)',
      { currentUserId: user.id },
    );
  }

  private stripLoadedAsistenciaRelations(asistencia: AsistenciaCasaPazQr) {
    const entityToSave = { ...asistencia } as Partial<AsistenciaCasaPazQr>;

    delete entityToSave.red;
    delete entityToSave.personaACargo;
    delete entityToSave.anfitrion;
    delete entityToSave.liderPrincipal;

    return entityToSave;
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
