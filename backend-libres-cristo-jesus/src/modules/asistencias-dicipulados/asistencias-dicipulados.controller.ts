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
import { AsistenciasDicipuladosService } from './asistencias-dicipulados.service';
import type {
  CompletePublicProfileDicipuladoDto,
  CreateAsistenciaDicipuladoDto,
  ListAsistenciasDicipuladosQuery,
  ListRegistrosDicipuladosQuery,
  RegistrarAsistenciaPublicaDicipuladoDto,
  UpdateAsistenciaDicipuladoDto,
} from './asistencias-dicipulados.service';
import { EstadoAsistenciaDicipulado } from '../../common/enums/estado-asistencia-dicipulado.enum';
import {
  AdminDeleteAccess,
  AdminWriteAccess,
} from '../auth/admin-access.decorator';

@Controller('asistencias-dicipulados')
export class AsistenciasDicipuladosController {
  constructor(
    private readonly asistenciasDicipuladosService: AsistenciasDicipuladosService,
  ) {}

  @Get()
  findAll(@Query() query: ListAsistenciasDicipuladosQuery): Promise<unknown> {
    return this.asistenciasDicipuladosService.findAll(query);
  }

  @AdminWriteAccess()
  @Post()
  create(@Body() payload: CreateAsistenciaDicipuladoDto): Promise<unknown> {
    return this.asistenciasDicipuladosService.create(payload);
  }

  @Get('public/:token')
  getPublicByToken(@Param('token') token: string): Promise<unknown> {
    return this.asistenciasDicipuladosService.getPublicByToken(token);
  }

  @Post('public/:token/registrar')
  registrarPublico(
    @Param('token') token: string,
    @Body() payload: RegistrarAsistenciaPublicaDicipuladoDto,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.registrarPublico(token, payload);
  }

  @Put('public/:token/completar-perfil')
  completePublicProfile(
    @Param('token') token: string,
    @Body() payload: CompletePublicProfileDicipuladoDto,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.completePublicProfile(
      token,
      payload,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasDicipuladosService.findOne(id);
  }

  @AdminWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAsistenciaDicipuladoDto,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.update(id, payload);
  }

  @AdminWriteAccess()
  @Patch(':id/estado')
  setEstado(
    @Param('id') id: string,
    @Body() payload: { estado: EstadoAsistenciaDicipulado },
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.setEstado(id, payload.estado);
  }

  @AdminDeleteAccess()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasDicipuladosService.remove(id);
  }

  @Get(':id/registros')
  findRegistrosByAsistencia(
    @Param('id') id: string,
    @Query() query: ListRegistrosDicipuladosQuery,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.findRegistrosByAsistencia(
      id,
      query,
    );
  }

  @Get(':id/registros/fechas')
  findFechasDisponiblesByAsistencia(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasDicipuladosService.findFechasDisponiblesByAsistencia(
      id,
    );
  }

  @Get(':id/registros/resumen')
  findResumenByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.findResumenByAsistencia(
      id,
      fecha,
    );
  }

  @Get(':id/registros/resumen-por-red')
  findResumenPorRedByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.findResumenPorRedByAsistencia(
      id,
      fecha,
    );
  }
}
