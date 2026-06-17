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
} from '@nestjs/common';
import { AsistenciasCasaPazService } from './asistencias-casa-paz.service';
import type {
  CompletePublicProfileCasaPazDto,
  CreateAsistenciaCasaPazDto,
  ListAsistenciasCasaPazQuery,
  ListRegistrosCasaPazQuery,
  RegistrarAsistenciaPublicaCasaPazDto,
  UpdateAsistenciaCasaPazDto,
} from './asistencias-casa-paz.service';
import { EstadoAsistenciaCasaPaz } from '../../common/enums/estado-asistencia-casa-paz.enum';
import {
  AdminDeleteAccess,
  AdminWriteAccess,
} from '../auth/admin-access.decorator';

@Controller('asistencias-casa-paz')
export class AsistenciasCasaPazController {
  constructor(
    private readonly asistenciasCasaPazService: AsistenciasCasaPazService,
  ) {}

  @Get()
  findAll(@Query() query: ListAsistenciasCasaPazQuery): Promise<unknown> {
    return this.asistenciasCasaPazService.findAll(query);
  }

  @AdminWriteAccess()
  @Post()
  create(@Body() payload: CreateAsistenciaCasaPazDto): Promise<unknown> {
    return this.asistenciasCasaPazService.create(payload);
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

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasCasaPazService.findOne(id);
  }

  @AdminWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAsistenciaCasaPazDto,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.update(id, payload);
  }

  @AdminWriteAccess()
  @Patch(':id/estado')
  setEstado(
    @Param('id') id: string,
    @Body() payload: { estado: EstadoAsistenciaCasaPaz },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.setEstado(id, payload.estado);
  }

  @AdminDeleteAccess()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasCasaPazService.remove(id);
  }

  @Get(':id/registros')
  findRegistrosByAsistencia(
    @Param('id') id: string,
    @Query() query: ListRegistrosCasaPazQuery,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findRegistrosByAsistencia(id, query);
  }

  @Get(':id/registros/fechas')
  findFechasDisponiblesByAsistencia(
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findFechasDisponiblesByAsistencia(id);
  }

  @Get(':id/registros/resumen')
  findResumenByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findResumenByAsistencia(id, fecha);
  }

  @Get(':id/registros/resumen-por-red')
  findResumenPorRedByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.findResumenPorRedByAsistencia(
      id,
      fecha,
    );
  }
}
