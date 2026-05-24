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
  CreateAsistenciaDicipuladoDto,
  ListAsistenciasDicipuladosQuery,
  ListRegistrosDicipuladosQuery,
  RegistrarAsistenciaPublicaDicipuladoDto,
  UpdateAsistenciaDicipuladoDto,
} from './asistencias-dicipulados.service';
import { EstadoAsistenciaDicipulado } from '../../common/enums/estado-asistencia-dicipulado.enum';

@Controller('asistencias-dicipulados')
export class AsistenciasDicipuladosController {
  constructor(
    private readonly asistenciasDicipuladosService: AsistenciasDicipuladosService,
  ) {}

  @Get()
  findAll(@Query() query: ListAsistenciasDicipuladosQuery): Promise<unknown> {
    return this.asistenciasDicipuladosService.findAll(query);
  }

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

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasDicipuladosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAsistenciaDicipuladoDto,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.update(id, payload);
  }

  @Patch(':id/estado')
  setEstado(
    @Param('id') id: string,
    @Body() payload: { estado: EstadoAsistenciaDicipulado },
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.setEstado(id, payload.estado);
  }

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
  findFechasDisponiblesByAsistencia(
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.asistenciasDicipuladosService.findFechasDisponiblesByAsistencia(
      id,
    );
  }
}
