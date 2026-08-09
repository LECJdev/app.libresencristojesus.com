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
import { Red } from '../redes/red.entity';
import { Persona } from '../personas/persona.entity';
import { CasaDePaz } from '../casas-de-paz/casa-de-paz.entity';
import { AsistenciaCasaPazQr } from '../asistencias-casa-paz/asistencia-casa-paz-qr.entity';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';
import { Rol } from '../../common/enums/rol.enum';
import { TipoDocumento } from '../../common/enums/tipo-documento.enum';
import { Genero } from '../../common/enums/genero.enum';
import { getPrimaryRole, normalizeRoles } from '../../common/utils/role.util';
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

const DEFAULT_REGISTROS_LIMIT = 100;
const MAX_REGISTROS_LIMIT = 300;
const MAX_REGISTROS_ALL_LIMIT = 1000;

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

interface AttendanceMonthlySummary {
  mes: string;
  totalAsistentes: number;
  totalNuevos: number;
}

interface AttendanceRedSummary {
  idRed: string | null;
  nombreRed: string | null;
  totalAsistentes: number;
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
  idRed?: string;
  page?: string;
  limit?: string;
}

export interface DominicalReportQuery {
  monthFrom?: string;
  monthTo?: string;
}

export interface DominicalReportLinkDto {
  id: string;
  nombre: string;
  estado: EstadoAsistenciaDominical;
  diaRegistro: DiaPredica;
  sede: {
    id: string;
    nombre: string | null;
  } | null;
}

export interface DominicalReportDateDto {
  fecha: string;
  totalAsistentes: number;
  totalNuevos: number;
}

export interface DominicalReportRedDto {
  idRed: string | null;
  nombreRed: string | null;
  totalAsistentes: number;
}

export interface DominicalReportPersonDto {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  attendanceByDate: Record<string, boolean>;
}

export interface DominicalReportResponse {
  generatedAt: string;
  asistencia: DominicalReportLinkDto;
  filters: {
    monthFrom: string | null;
    monthTo: string | null;
  };
  attendanceByDate: DominicalReportDateDto[];
  attendanceByRed: DominicalReportRedDto[];
  people: DominicalReportPersonDto[];
}

export interface DominicalPersonDetailResponse {
  persona: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    edad: number | null;
    celular: string | null;
    tipoDocumento: TipoDocumento | null;
    documento: string | null;
    genero: Genero | null;
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
  };
  casaDePaz: {
    legacy: Array<{
      id: string;
      direccion: string | null;
      detalle: string | null;
      activa: boolean | null;
      diaDePredica: DiaPredica | null;
      idDistrito: string | null;
    }>;
    qr: Array<{
      id: string;
      nombre: string;
      estado: string;
      diaRegistro: DiaPredica;
      direccionCasa: string;
      red: {
        id: string;
        nombre: string | null;
      } | null;
      roles: Array<'personaACargo' | 'anfitrion' | 'liderPrincipal'>;
    }>;
  };
}

interface DominicalReportRegistrationRaw {
  fecha: string | Date;
  esNuevo: boolean | string | number | null;
  personaId: string | null;
  nombres: string | null;
  apellidos: string | null;
  redId: string | null;
  redNombre: string | null;
}

interface DominicalPersonProfileRaw {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  edad: number | string | null;
  celular: string | null;
  tipoDocumento: TipoDocumento | null;
  documento: string | null;
  genero: Genero | null;
  direccion: string | null;
  correo: string | null;
  encuentro: boolean | null;
  rol: Rol | null;
  roles: Rol[] | null;
  barrio: string | null;
  departamento: string | null;
  ciudad: string | null;
  fechaNacimiento: string | Date | null;
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

export interface RegistrarAsistenciaPublicaDto {
  documento: string;
  persona?: PersonaRegistroPublicoDto;
}

export interface CompletePublicProfileDto {
  personaId: string;
  documento: string;
  idRed?: string;
  fechaNacimiento?: string;
  celular?: string;
  departamento?: string;
  ciudad?: string;
}

export type MissingProfileField =
  | 'idRed'
  | 'fechaNacimiento'
  | 'celular'
  | 'departamento'
  | 'ciudad';

export interface DominicalAttendanceExportRow {
  idRegistro: string;
  fechaRegistro: string;
  esNuevo: boolean;
  asistenciaId: string;
  asistenciaNombre: string;
  sede: string | null;
  diaRegistro: DiaPredica;
  estado: EstadoAsistenciaDominical;
  redId: string | null;
  redNombre: string | null;
  personaId: string | null;
  nombres: string | null;
  apellidos: string | null;
  tipoDocumento: TipoDocumento | null;
  documento: string | null;
  celular: string | null;
  edad: number | null;
  genero: Genero | null;
  direccion: string | null;
  correo: string | null;
  barrio: string | null;
  departamento: string | null;
  ciudad: string | null;
  fechaNacimiento: string | null;
}

export interface DominicalAttendanceExportResponse {
  rows: DominicalAttendanceExportRow[];
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

    @InjectRepository(Red)
    private readonly redRepo: Repository<Red>,

    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,

    @InjectRepository(CasaDePaz)
    private readonly casaDePazRepo: Repository<CasaDePaz>,

    @InjectRepository(AsistenciaCasaPazQr)
    private readonly asistenciaCasaPazQrRepo: Repository<AsistenciaCasaPazQr>,
  ) {}

  async findReportLinks(): Promise<DominicalReportLinkDto[]> {
    const rows = await this.asistenciaDominicalRepo
      .createQueryBuilder('asistencia')
      .leftJoin('asistencia.sede', 'sede')
      .select('asistencia.id', 'id')
      .addSelect('asistencia.nombre', 'nombre')
      .addSelect('asistencia.estado', 'estado')
      .addSelect('asistencia.diaRegistro', 'diaRegistro')
      .addSelect('sede.id', 'sedeId')
      .addSelect('sede.nombre', 'sedeNombre')
      .orderBy('asistencia.nombre', 'ASC')
      .addOrderBy('asistencia.id', 'ASC')
      .getRawMany<{
        id: string;
        nombre: string;
        estado: EstadoAsistenciaDominical;
        diaRegistro: DiaPredica;
        sedeId: string | null;
        sedeNombre: string | null;
      }>();

    return rows.map((row) => this.mapDominicalReportLink(row));
  }

  async findReport(
    asistenciaId: string,
    query: DominicalReportQuery,
  ): Promise<DominicalReportResponse> {
    const safeAsistenciaId = sanitizeEntityIdOrThrow(
      asistenciaId,
      'ID de asistencia',
    );
    const asistencia = await this.findReportLinkOrThrow(safeAsistenciaId);
    const filters = this.normalizeDominicalReportFilters(query);

    const qb = this.registroDominicalRepo
      .createQueryBuilder('registro')
      .leftJoin('registro.persona', 'persona')
      .leftJoin('persona.red', 'red')
      .select('registro.fechaRegistro', 'fecha')
      .addSelect('registro.esNuevo', 'esNuevo')
      .addSelect('persona.id', 'personaId')
      .addSelect('persona.nombres', 'nombres')
      .addSelect('persona.apellidos', 'apellidos')
      .addSelect('red.id', 'redId')
      .addSelect('red.nombre', 'redNombre')
      .where('registro.idAsistencia = :asistenciaId', {
        asistenciaId: safeAsistenciaId,
      })
      .orderBy('registro.fechaRegistro', 'ASC')
      .addOrderBy('persona.apellidos', 'ASC')
      .addOrderBy('persona.nombres', 'ASC')
      .addOrderBy('persona.id', 'ASC');

    this.applyDominicalReportDateFilters(qb, filters);

    const rows = await qb.getRawMany<DominicalReportRegistrationRaw>();
    const dateMap = new Map<string, DominicalReportDateDto>();
    const redMap = new Map<string, DominicalReportRedDto>();
    const peopleMap = new Map<string, DominicalReportPersonDto>();

    for (const row of rows) {
      const fecha = normalizeAttendanceDateOrThrow(
        row.fecha,
        'La fecha de asistencia',
      );
      const dateSummary = dateMap.get(fecha) ?? {
        fecha,
        totalAsistentes: 0,
        totalNuevos: 0,
      };
      dateSummary.totalAsistentes += 1;
      if (this.normalizeBooleanValue(row.esNuevo)) {
        dateSummary.totalNuevos += 1;
      }
      dateMap.set(fecha, dateSummary);

      const redKey = row.redId ?? '__unassigned__';
      const redSummary = redMap.get(redKey) ?? {
        idRed: row.redId ?? null,
        nombreRed: row.redNombre ?? null,
        totalAsistentes: 0,
      };
      redSummary.totalAsistentes += 1;
      redMap.set(redKey, redSummary);

      if (!row.personaId) {
        continue;
      }

      const person = peopleMap.get(row.personaId) ?? {
        id: row.personaId,
        nombres: row.nombres ?? null,
        apellidos: row.apellidos ?? null,
        attendanceByDate: {},
      };
      person.attendanceByDate[fecha] = true;
      peopleMap.set(row.personaId, person);
    }

    return {
      generatedAt: new Date().toISOString(),
      asistencia,
      filters: {
        monthFrom: filters.monthFrom ?? null,
        monthTo: filters.monthTo ?? null,
      },
      attendanceByDate: Array.from(dateMap.values()).sort((left, right) =>
        left.fecha.localeCompare(right.fecha),
      ),
      attendanceByRed: Array.from(redMap.values()).sort((left, right) => {
        if (right.totalAsistentes !== left.totalAsistentes) {
          return right.totalAsistentes - left.totalAsistentes;
        }

        return (left.nombreRed ?? 'Sin Red asignada').localeCompare(
          right.nombreRed ?? 'Sin Red asignada',
        );
      }),
      people: Array.from(peopleMap.values()).sort((left, right) => {
        const leftName = `${left.apellidos ?? ''} ${left.nombres ?? ''}`.trim();
        const rightName =
          `${right.apellidos ?? ''} ${right.nombres ?? ''}`.trim();
        return (
          leftName.localeCompare(rightName) || left.id.localeCompare(right.id)
        );
      }),
    };
  }

  async findReportPerson(
    asistenciaId: string,
    personaId: string,
  ): Promise<DominicalPersonDetailResponse> {
    const safeAsistenciaId = sanitizeEntityIdOrThrow(
      asistenciaId,
      'ID de asistencia',
    );
    const safePersonaId = sanitizeEntityIdOrThrow(personaId, 'ID de persona');

    await this.findReportLinkOrThrow(safeAsistenciaId);

    const registration = await this.registroDominicalRepo
      .createQueryBuilder('registro')
      .select('registro.id', 'id')
      .where('registro.idAsistencia = :asistenciaId', {
        asistenciaId: safeAsistenciaId,
      })
      .andWhere('registro.idPersona = :personaId', { personaId: safePersonaId })
      .getRawOne<{ id: string }>();

    if (!registration) {
      throw new NotFoundException(
        'La persona no está registrada en esta asistencia dominical',
      );
    }

    const profile = await this.personaRepo
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
      .addSelect('persona.fechaModificacion', 'fechaModificacion')
      .where('persona.id = :personaId', { personaId: safePersonaId })
      .getRawOne<DominicalPersonProfileRaw>();

    if (!profile) {
      throw new NotFoundException('Persona no encontrada');
    }

    const legacyResponsibilities = await this.casaDePazRepo
      .createQueryBuilder('casaDePaz')
      .select('casaDePaz.id', 'id')
      .addSelect('casaDePaz.direccion', 'direccion')
      .addSelect('casaDePaz.detalle', 'detalle')
      .addSelect('casaDePaz.activa', 'activa')
      .addSelect('casaDePaz.diaDePredica', 'diaDePredica')
      .addSelect('casaDePaz.idDistrito', 'idDistrito')
      .where('casaDePaz.idPersonaACargo = :personaId', {
        personaId: safePersonaId,
      })
      .orderBy('casaDePaz.id', 'ASC')
      .getRawMany<{
        id: string;
        direccion: string | null;
        detalle: string | null;
        activa: boolean | null;
        diaDePredica: DiaPredica | null;
        idDistrito: string | null;
      }>();

    const qrResponsibilities = await this.asistenciaCasaPazQrRepo
      .createQueryBuilder('asistencia')
      .leftJoin('asistencia.red', 'red')
      .select('asistencia.id', 'id')
      .addSelect('asistencia.nombre', 'nombre')
      .addSelect('asistencia.estado', 'estado')
      .addSelect('asistencia.diaRegistro', 'diaRegistro')
      .addSelect('asistencia.direccionCasa', 'direccionCasa')
      .addSelect('asistencia.idRed', 'idRed')
      .addSelect('red.nombre', 'redNombre')
      .addSelect('asistencia.idPersonaACargo', 'idPersonaACargo')
      .addSelect('asistencia.idAnfitrion', 'idAnfitrion')
      .addSelect('asistencia.idLiderPrincipal', 'idLiderPrincipal')
      .where(
        '(asistencia.idPersonaACargo = :personaId OR asistencia.idAnfitrion = :personaId OR asistencia.idLiderPrincipal = :personaId)',
        { personaId: safePersonaId },
      )
      .orderBy('asistencia.nombre', 'ASC')
      .addOrderBy('asistencia.id', 'ASC')
      .getRawMany<{
        id: string;
        nombre: string;
        estado: string;
        diaRegistro: DiaPredica;
        direccionCasa: string;
        idRed: string | null;
        redNombre: string | null;
        idPersonaACargo: string | null;
        idAnfitrion: string | null;
        idLiderPrincipal: string | null;
      }>();

    const roles = this.normalizeProjectedRoles(profile.roles, profile.rol);

    return {
      persona: {
        id: profile.id,
        nombres: profile.nombres ?? null,
        apellidos: profile.apellidos ?? null,
        edad: profile.edad === null ? null : Number(profile.edad),
        celular: profile.celular ?? null,
        tipoDocumento: profile.tipoDocumento ?? null,
        documento: profile.documento ?? null,
        genero: profile.genero ?? null,
        direccion: profile.direccion ?? null,
        correo: profile.correo ?? null,
        encuentro: profile.encuentro ?? null,
        rol: getPrimaryRole({ roles }),
        roles,
        barrio: profile.barrio ?? null,
        departamento: profile.departamento ?? null,
        ciudad: profile.ciudad ?? null,
        fechaNacimiento: this.normalizeNullableDate(profile.fechaNacimiento),
        idRed: profile.idRed ?? null,
        red: profile.redId
          ? {
              id: profile.redId,
              nombre: profile.redNombre ?? null,
              detalles: profile.redDetalles ?? null,
              idSede: profile.redIdSede ?? null,
              sede: profile.sedeId
                ? {
                    id: profile.sedeId,
                    nombre: profile.sedeNombre ?? null,
                    direccion: profile.sedeDireccion ?? null,
                  }
                : null,
            }
          : null,
        invitadoPor: profile.invitadoPorId
          ? {
              id: profile.invitadoPorId,
              nombres: profile.invitadoPorNombres ?? null,
              apellidos: profile.invitadoPorApellidos ?? null,
            }
          : null,
        fechaCreacion: profile.fechaCreacion ?? null,
        fechaModificacion: profile.fechaModificacion ?? null,
      },
      casaDePaz: {
        legacy: legacyResponsibilities.map((item) => ({
          id: item.id,
          direccion: item.direccion ?? null,
          detalle: item.detalle ?? null,
          activa: item.activa ?? null,
          diaDePredica: item.diaDePredica ?? null,
          idDistrito: item.idDistrito ?? null,
        })),
        qr: qrResponsibilities.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          estado: item.estado,
          diaRegistro: item.diaRegistro,
          direccionCasa: item.direccionCasa,
          red: item.idRed
            ? { id: item.idRed, nombre: item.redNombre ?? null }
            : null,
          roles: [
            ...(item.idPersonaACargo === safePersonaId
              ? (['personaACargo'] as const)
              : []),
            ...(item.idAnfitrion === safePersonaId
              ? (['anfitrion'] as const)
              : []),
            ...(item.idLiderPrincipal === safePersonaId
              ? (['liderPrincipal'] as const)
              : []),
          ],
        })),
      },
    };
  }

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

    const { page, limit } = this.getPagination(query.page, query.limit, {
      defaultLimit: DEFAULT_REGISTROS_LIMIT,
      maxLimit: MAX_REGISTROS_LIMIT,
      allowAll: true,
      allLimit: MAX_REGISTROS_ALL_LIMIT,
    });
    const fecha = this.normalizeFechaFiltro(query.fecha);
    const idRed = query.idRed
      ? sanitizeEntityIdOrThrow(query.idRed, 'ID de red')
      : undefined;

    const qb = this.registroDominicalRepo
      .createQueryBuilder('registro')
      .leftJoinAndSelect('registro.persona', 'persona');

    if (idRed) {
      qb.leftJoin('persona.red', 'red');
    }

    qb.where('registro.idAsistencia = :asistenciaId', { asistenciaId })
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

    if (idRed) {
      qb.andWhere('red.id = :idRed', { idRed });
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

    const raw = await this.registroDominicalRepo
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

  async findResumenPorMesByAsistencia(
    asistenciaId: string,
  ): Promise<AttendanceMonthlySummary[]> {
    await this.findOne(asistenciaId);

    const rows = await this.registroDominicalRepo
      .createQueryBuilder('registro')
      .select("TO_CHAR(registro.fechaRegistro, 'YYYY-MM')", 'mes')
      .addSelect('COUNT(*)', 'totalAsistentes')
      .addSelect(
        'COALESCE(SUM(CASE WHEN registro.esNuevo = true THEN 1 ELSE 0 END), 0)',
        'totalNuevos',
      )
      .where('registro.idAsistencia = :asistenciaId', { asistenciaId })
      .groupBy("TO_CHAR(registro.fechaRegistro, 'YYYY-MM')")
      .orderBy('mes', 'ASC')
      .getRawMany<{
        mes: string;
        totalAsistentes: string | number;
        totalNuevos: string | number;
      }>();

    if (rows.length === 0) {
      return [];
    }

    const sortedRows = [...rows].sort((left, right) =>
      left.mes.localeCompare(right.mes),
    );
    const rowsByMonth = new Map(sortedRows.map((row) => [row.mes, row]));
    const [startYear, startMonth] = sortedRows[0].mes.split('-').map(Number);
    const [endYear, endMonth] = sortedRows[sortedRows.length - 1].mes
      .split('-')
      .map(Number);
    const result: AttendanceMonthlySummary[] = [];

    let year = startYear;
    let month = startMonth;
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const mes = `${year.toString().padStart(4, '0')}-${month
        .toString()
        .padStart(2, '0')}`;
      const row = rowsByMonth.get(mes);

      result.push({
        mes,
        totalAsistentes: Number(row?.totalAsistentes ?? 0),
        totalNuevos: Number(row?.totalNuevos ?? 0),
      });

      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    return result;
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

    const rows = await this.registroDominicalRepo
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

  async exportRegistros(
    asistenciaId: string,
    fechaRaw?: string,
  ): Promise<DominicalAttendanceExportResponse> {
    await this.findOne(asistenciaId);

    const fecha =
      fechaRaw === undefined
        ? undefined
        : normalizeAttendanceDateOrThrow(fechaRaw, 'La fecha de exportación');

    const qb = this.registroDominicalRepo
      .createQueryBuilder('registro')
      .leftJoin('registro.asistencia', 'asistencia')
      .leftJoin('asistencia.sede', 'sede')
      .leftJoin('registro.persona', 'persona')
      .leftJoin('persona.red', 'red')
      .where('registro.idAsistencia = :asistenciaId', { asistenciaId })
      .select('registro.id', 'idRegistro')
      .addSelect('registro.fechaRegistro', 'fechaRegistro')
      .addSelect('registro.esNuevo', 'esNuevo')
      .addSelect('asistencia.id', 'asistenciaId')
      .addSelect('asistencia.nombre', 'asistenciaNombre')
      .addSelect('sede.nombre', 'sedeNombre')
      .addSelect('asistencia.diaRegistro', 'diaRegistro')
      .addSelect('asistencia.estado', 'estado')
      .addSelect('red.id', 'redId')
      .addSelect('red.nombre', 'redNombre')
      .addSelect('persona.id', 'personaId')
      .addSelect('persona.nombres', 'nombres')
      .addSelect('persona.apellidos', 'apellidos')
      .addSelect('persona.tipoDocumento', 'tipoDocumento')
      .addSelect('persona.documento', 'documento')
      .addSelect('persona.celular', 'celular')
      .addSelect('persona.edad', 'edad')
      .addSelect('persona.genero', 'genero')
      .addSelect('persona.direccion', 'direccion')
      .addSelect('persona.correo', 'correo')
      .addSelect('persona.barrio', 'barrio')
      .addSelect('persona.departamento', 'departamento')
      .addSelect('persona.ciudad', 'ciudad')
      .addSelect('persona.fechaNacimiento', 'fechaNacimiento')
      .orderBy('registro.fechaRegistro', 'ASC')
      .addOrderBy('persona.apellidos', 'ASC')
      .addOrderBy('persona.nombres', 'ASC')
      .addOrderBy('registro.id', 'ASC');

    if (fecha) {
      qb.andWhere('registro.fechaRegistro = :fecha', { fecha });
    }

    const rows = await qb.getRawMany();

    return {
      rows: rows.map((row: Record<string, unknown>) =>
        this.mapDominicalAttendanceExportRow(row),
      ),
    };
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
    needsProfileCompletion: boolean;
    profileCompletion: {
      needsRed: boolean;
      needsFechaNacimiento: boolean;
    };
    persona: Persona;
    registroId: string;
    fechaRegistro: string;
    missingFields: MissingProfileField[];
  }> {
    const asistencia = await this.validatePublicAttendanceAvailability(token);

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

    const existente = await this.registroDominicalRepo.findOneBy({
      idAsistencia: asistencia.id,
      idPersona: persona.id,
      fechaRegistro,
    });

    if (existente) {
      const missingFields = this.getMissingProfileFields(persona);
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
        persona,
        registroId: existente.id,
        fechaRegistro,
        missingFields,
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
      const missingFields = this.getMissingProfileFields(persona);
      const profileCompletion = this.buildProfileCompletion(persona, esNuevo);
      return {
        alreadyRegistered: false,
        esNuevo,
        needsProfileCompletion:
          profileCompletion.needsRed || profileCompletion.needsFechaNacimiento,
        profileCompletion,
        persona,
        registroId: saved.id,
        fechaRegistro,
        missingFields,
      };
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        const duplicated = await this.registroDominicalRepo.findOneBy({
          idAsistencia: asistencia.id,
          idPersona: persona.id,
          fechaRegistro,
        });

        if (duplicated) {
          const missingFields = this.getMissingProfileFields(persona);
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
            persona,
            registroId: duplicated.id,
            fechaRegistro,
            missingFields,
          };
        }
      }

      throw error;
    }
  }

  async completePublicProfile(
    token: string,
    payload: CompletePublicProfileDto,
  ): Promise<Persona> {
    const asistencia = await this.getPublicByToken(sanitizeTokenOrThrow(token));
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

    const registro = await this.registroDominicalRepo.findOneBy({
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

    if (!persona.celular && payload.celular) {
      updateData.celular = sanitizeCelularOrThrow(payload.celular);
    }

    if (!persona.departamento && payload.departamento) {
      updateData.departamento = sanitizeRequiredTextOrThrow(
        payload.departamento,
        'Departamento',
        150,
      );
    }

    if (!persona.ciudad && payload.ciudad) {
      updateData.ciudad = sanitizeRequiredTextOrThrow(
        payload.ciudad,
        'Ciudad',
        150,
      );
    }

    if (Object.keys(updateData).length === 0) {
      return persona;
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

    return updated;
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

  private getMissingProfileFields(persona: Persona): MissingProfileField[] {
    const missingFields: MissingProfileField[] = [];

    if (!this.hasAssignedRed(persona)) {
      missingFields.push('idRed');
    }

    if (!persona.fechaNacimiento) {
      missingFields.push('fechaNacimiento');
    }

    if (!persona.celular) {
      missingFields.push('celular');
    }

    if (!persona.departamento) {
      missingFields.push('departamento');
    }

    if (!persona.ciudad) {
      missingFields.push('ciudad');
    }

    return missingFields;
  }

  private async validatePublicAttendanceAvailability(
    token: string,
  ): Promise<AsistenciaDominical> {
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

    return asistencia;
  }

  private getErrorMessage(error: unknown): string {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = (response as { message?: string | string[] }).message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }

        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }

    return 'No fue posible registrar esta persona';
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

  private async findReportLinkOrThrow(
    asistenciaId: string,
  ): Promise<DominicalReportLinkDto> {
    const row = await this.asistenciaDominicalRepo
      .createQueryBuilder('asistencia')
      .leftJoin('asistencia.sede', 'sede')
      .select('asistencia.id', 'id')
      .addSelect('asistencia.nombre', 'nombre')
      .addSelect('asistencia.estado', 'estado')
      .addSelect('asistencia.diaRegistro', 'diaRegistro')
      .addSelect('sede.id', 'sedeId')
      .addSelect('sede.nombre', 'sedeNombre')
      .where('asistencia.id = :asistenciaId', { asistenciaId })
      .getRawOne<{
        id: string;
        nombre: string;
        estado: EstadoAsistenciaDominical;
        diaRegistro: DiaPredica;
        sedeId: string | null;
        sedeNombre: string | null;
      }>();

    if (!row) {
      throw new NotFoundException('Asistencia dominical no encontrada');
    }

    return this.mapDominicalReportLink(row);
  }

  private mapDominicalReportLink(row: {
    id: string;
    nombre: string;
    estado: EstadoAsistenciaDominical;
    diaRegistro: DiaPredica;
    sedeId: string | null;
    sedeNombre: string | null;
  }): DominicalReportLinkDto {
    return {
      id: row.id,
      nombre: row.nombre,
      estado: row.estado,
      diaRegistro: row.diaRegistro,
      sede: row.sedeId
        ? { id: row.sedeId, nombre: row.sedeNombre ?? null }
        : null,
    };
  }

  private normalizeDominicalReportFilters(query: DominicalReportQuery): {
    monthFrom?: string;
    monthTo?: string;
  } {
    const monthFrom = query.monthFrom
      ? this.normalizeMonthOrThrow(query.monthFrom, 'monthFrom')
      : undefined;
    const monthTo = query.monthTo
      ? this.normalizeMonthOrThrow(query.monthTo, 'monthTo')
      : undefined;

    if (monthFrom && monthTo && monthFrom > monthTo) {
      throw new BadRequestException(
        'monthFrom no puede ser posterior a monthTo',
      );
    }

    return { monthFrom, monthTo };
  }

  private applyDominicalReportDateFilters(
    qb: {
      andWhere: (
        query: string,
        parameters?: Record<string, unknown>,
      ) => unknown;
    },
    filters: { monthFrom?: string; monthTo?: string },
  ) {
    if (filters.monthFrom) {
      qb.andWhere('registro.fechaRegistro >= :monthFromStart', {
        monthFromStart: `${filters.monthFrom}-01`,
      });
    }

    if (filters.monthTo) {
      qb.andWhere('registro.fechaRegistro < :monthToEnd', {
        monthToEnd: this.buildMonthRange(filters.monthTo).endDate,
      });
    }
  }

  private normalizeMonthOrThrow(value: string, label: string): string {
    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
    const month = match ? Number(match[2]) : Number.NaN;

    if (!match || month < 1 || month > 12) {
      throw new BadRequestException(`${label} debe tener formato YYYY-MM`);
    }

    return trimmed;
  }

  private buildMonthRange(month: string): {
    startDate: string;
    endDate: string;
  } {
    const [yearRaw, monthRaw] = month.split('-');
    const start = new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, 1));
    const end = new Date(Date.UTC(Number(yearRaw), Number(monthRaw), 1));

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  private normalizeProjectedRoles(value: unknown, primary: Rol | null): Rol[] {
    const validRoles = new Set<Rol>(Object.values(Rol));
    let projectedRoles: Rol[] = [];

    if (Array.isArray(value)) {
      projectedRoles = value.filter((role): role is Rol =>
        validRoles.has(role as Rol),
      );
    } else if (typeof value === 'string') {
      projectedRoles = value
        .replace(/^[{]|[}]$/g, '')
        .split(',')
        .map((role) => role.trim().replace(/^"|"$/g, '') as Rol)
        .filter((role) => validRoles.has(role));
    }

    return normalizeRoles({
      rol: primary,
      roles: projectedRoles,
    });
  }

  private normalizeBooleanValue(
    value: boolean | string | number | null,
  ): boolean {
    return value === true || value === 1 || value === 'true';
  }

  private normalizeNullableDate(value: string | Date | null): string | null {
    return value === null ? null : normalizeAttendanceDateOrThrow(value);
  }

  private getPagination(
    pageRaw?: string,
    limitRaw?: string,
    options: {
      defaultLimit?: number;
      maxLimit?: number;
      allowAll?: boolean;
      allLimit?: number;
    } = {},
  ): {
    page: number;
    limit: number;
  } {
    const defaultLimit = options.defaultLimit ?? 10;
    const maxLimit = options.maxLimit ?? 100;
    const allLimit = options.allLimit ?? maxLimit;
    const parsedPage = Number.parseInt(pageRaw ?? '1', 10);
    const isAll = options.allowAll && limitRaw?.trim().toLowerCase() === 'all';
    const parsedLimit = Number.parseInt(limitRaw ?? String(defaultLimit), 10);

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    if (isAll) {
      return { page, limit: allLimit };
    }

    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, maxLimit)
        : defaultLimit;

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

    return map[getBogotaDayOfWeek(date)];
  }

  private getCurrentDateString(): string {
    return getBogotaDateString();
  }

  private mapDominicalAttendanceExportRow(
    row: Record<string, unknown>,
  ): DominicalAttendanceExportRow {
    return {
      idRegistro: (row.idRegistro ?? '') as string,
      fechaRegistro: (row.fechaRegistro ?? '') as string,
      esNuevo: Boolean(row.esNuevo),
      asistenciaId: (row.asistenciaId ?? '') as string,
      asistenciaNombre: (row.asistenciaNombre ?? '') as string,
      sede: (row.sedeNombre ?? null) as string | null,
      diaRegistro: (row.diaRegistro ?? '') as DiaPredica,
      estado: (row.estado ?? '') as EstadoAsistenciaDominical,
      redId: (row.redId ?? null) as string | null,
      redNombre: (row.redNombre ?? null) as string | null,
      personaId: (row.personaId ?? null) as string | null,
      nombres: (row.nombres ?? null) as string | null,
      apellidos: (row.apellidos ?? null) as string | null,
      tipoDocumento: (row.tipoDocumento ?? null) as TipoDocumento | null,
      documento: (row.documento ?? null) as string | null,
      celular: (row.celular ?? null) as string | null,
      edad:
        row.edad === null || row.edad === undefined ? null : Number(row.edad),
      genero: (row.genero ?? null) as Genero | null,
      direccion: (row.direccion ?? null) as string | null,
      correo: (row.correo ?? null) as string | null,
      barrio: (row.barrio ?? null) as string | null,
      departamento: (row.departamento ?? null) as string | null,
      ciudad: (row.ciudad ?? null) as string | null,
      fechaNacimiento: (row.fechaNacimiento ?? null) as string | null,
    };
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
