import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AsistenciasCasaPazService } from './asistencias-casa-paz.service';
import type {
  CasaPazSesionUpsertDto,
  CasaPazReportQuery,
  CasaPazReportExportResponse,
  CompletePublicProfileCasaPazDto,
  CreateAsistenciaCasaPazDto,
  ListAsistenciasCasaPazQuery,
  ListRegistrosCasaPazQuery,
  PersonaRoleOptionDto,
  RegistrarAsistenciaPublicaCasaPazDto,
  UpdateAsistenciaCasaPazDto,
} from './asistencias-casa-paz.service';
import { EstadoAsistenciaCasaPaz } from '../../common/enums/estado-asistencia-casa-paz.enum';
import {
  AdminDeleteAccess,
  CasaDePazReadAccess,
  CasaDePazWriteAccess,
} from '../auth/admin-access.decorator';
import { AuthenticatedUser } from '../../common/utils/role.util';

@Controller('asistencias-casa-paz')
export class AsistenciasCasaPazController {
  constructor(
    private readonly asistenciasCasaPazService: AsistenciasCasaPazService,
  ) {}

  @CasaDePazReadAccess()
  @Get()
  findAll(
    @Query() query: ListAsistenciasCasaPazQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findAll(query, req.user);
  }

  @CasaDePazReadAccess()
  @Get('person-options')
  findPersonaRoleOptions(): Promise<PersonaRoleOptionDto[]> {
    return this.asistenciasCasaPazService.findPersonaRoleOptions();
  }

  @CasaDePazReadAccess()
  @Get('reportes/resumen-general')
  findGeneralReport(@Req() req: { user: AuthenticatedUser }): Promise<unknown> {
    return this.asistenciasCasaPazService.findGeneralReport(req.user);
  }

  @CasaDePazReadAccess()
  @Get('reportes/mensual')
  findMonthlyReport(
    @Query() query: CasaPazReportQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findMonthlyReport(
      query.month,
      req.user,
    );
  }

  @CasaDePazReadAccess()
  @Get('reportes/diario')
  findDailyReport(
    @Query() query: CasaPazReportQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findDailyReport(
      query.fecha,
      req.user,
    );
  }

  @CasaDePazReadAccess()
  @Get('reportes/encounter-candidates')
  findEncounterCandidates(
    @Query() query: CasaPazReportQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findEncounterCandidatesReport(
      query,
      req.user,
    );
  }

  @CasaDePazReadAccess()
  @Get('reportes/export-rows')
  findExportRows(
    @Query() query: CasaPazReportQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<CasaPazReportExportResponse> {
    return this.asistenciasCasaPazService.findExportRowsReport(query, req.user);
  }

  @CasaDePazWriteAccess()
  @Post()
  create(
    @Body() payload: CreateAsistenciaCasaPazDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.create(payload, req.user);
  }

  @Get('public/:token')
  getPublicByToken(@Param('token') token: string): Promise<unknown> {
    return this.asistenciasCasaPazService.getPublicByToken(token);
  }

  @Post('public/:token/registrar')
  registrarPublico(
    @Param('token') token: string,
    @Body() payload: RegistrarAsistenciaPublicaCasaPazDto,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.registrarPublico(token, payload);
  }

  @Put('public/:token/completar-perfil')
  completePublicProfile(
    @Param('token') token: string,
    @Body() payload: CompletePublicProfileCasaPazDto,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.completePublicProfile(token, payload);
  }

  @Put('public/:token/ofrenda')
  upsertPublicOffering(
    @Param('token') token: string,
    @Body() payload: { montoOfrenda: number },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.upsertPublicOffering(token, payload);
  }

  @CasaDePazReadAccess()
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findOne(id, req.user);
  }

  @CasaDePazReadAccess()
  @Get(':id/reportes')
  findDetailReport(
    @Param('id') id: string,
    @Query() query: CasaPazReportQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findDetailReport(id, query, req.user);
  }

  @CasaDePazReadAccess()
  @Get(':id/reportes/export-rows')
  findDetailExportRows(
    @Param('id') id: string,
    @Query() query: CasaPazReportQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<CasaPazReportExportResponse> {
    return this.asistenciasCasaPazService.findDetailExportRowsReport(
      id,
      query,
      req.user,
    );
  }

  @CasaDePazWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAsistenciaCasaPazDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.update(id, payload, req.user);
  }

  @CasaDePazWriteAccess()
  @Patch(':id/estado')
  setEstado(
    @Param('id') id: string,
    @Body() payload: { estado: EstadoAsistenciaCasaPaz },
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.setEstado(
      id,
      payload.estado,
      req.user,
    );
  }

  @AdminDeleteAccess()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasCasaPazService.remove(id);
  }

  @CasaDePazReadAccess()
  @Get(':id/registros')
  findRegistrosByAsistencia(
    @Param('id') id: string,
    @Query() query: ListRegistrosCasaPazQuery,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findRegistrosByAsistencia(
      id,
      query,
      req.user,
    );
  }

  @CasaDePazReadAccess()
  @Get(':id/registros/fechas')
  findFechasDisponiblesByAsistencia(
    @Param('id') id: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findFechasDisponiblesByAsistencia(
      id,
      req.user,
    );
  }

  @CasaDePazReadAccess()
  @Get(':id/registros/resumen')
  findResumenByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findResumenByAsistencia(
      id,
      fecha,
      req.user,
    );
  }

  @CasaDePazReadAccess()
  @Get(':id/registros/resumen-por-red')
  findResumenPorRedByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findResumenPorRedByAsistencia(
      id,
      fecha,
      req.user,
    );
  }

  @CasaDePazReadAccess()
  @Get(':id/sesion')
  findSesionByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findSesionByAsistencia(
      id,
      fecha,
      req.user,
    );
  }

  @CasaDePazWriteAccess()
  @Put(':id/sesion')
  upsertSesionByAsistencia(
    @Param('id') id: string,
    @Body() payload: CasaPazSesionUpsertDto,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.upsertSesionByAsistencia(
      id,
      payload,
      req.user,
    );
  }
}
