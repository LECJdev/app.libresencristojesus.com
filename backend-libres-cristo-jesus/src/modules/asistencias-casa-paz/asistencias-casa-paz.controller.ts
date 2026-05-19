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
  CreateAsistenciaCasaPazDto,
  ListAsistenciasCasaPazQuery,
  ListRegistrosCasaPazQuery,
  RegistrarAsistenciaPublicaCasaPazDto,
  UpdateAsistenciaCasaPazDto,
} from './asistencias-casa-paz.service';
import { EstadoAsistenciaCasaPaz } from '../../common/enums/estado-asistencia-casa-paz.enum';

@Controller('asistencias-casa-paz')
export class AsistenciasCasaPazController {
  constructor(
    private readonly asistenciasCasaPazService: AsistenciasCasaPazService,
  ) {}

  @Get()
  findAll(@Query() query: ListAsistenciasCasaPazQuery): Promise<unknown> {
    return this.asistenciasCasaPazService.findAll(query);
  }

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

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasCasaPazService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAsistenciaCasaPazDto,
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.update(id, payload);
  }

  @Patch(':id/estado')
  setEstado(
    @Param('id') id: string,
    @Body() payload: { estado: EstadoAsistenciaCasaPaz },
  ): Promise<unknown> {
    return this.asistenciasCasaPazService.setEstado(id, payload.estado);
  }

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
}
