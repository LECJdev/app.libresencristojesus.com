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
import { AsistenciasDominicalesService } from './asistencias-dominicales.service';
import type {
  CreateAsistenciaDominicalDto,
  ListAsistenciasDominicalesQuery,
  ListRegistrosDominicalesQuery,
  RegistrarAsistenciaPublicaDto,
  UpdateAsistenciaDominicalDto,
} from './asistencias-dominicales.service';
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';

@Controller('asistencias-dominicales')
export class AsistenciasDominicalesController {
  constructor(
    private readonly asistenciasDominicalesService: AsistenciasDominicalesService,
  ) {}

  @Get()
  findAll(@Query() query: ListAsistenciasDominicalesQuery): Promise<unknown> {
    return this.asistenciasDominicalesService.findAll(query);
  }

  @Post()
  create(@Body() payload: CreateAsistenciaDominicalDto): Promise<unknown> {
    return this.asistenciasDominicalesService.create(payload);
  }

  @Get('public/:token')
  getPublicByToken(@Param('token') token: string): Promise<unknown> {
    return this.asistenciasDominicalesService.getPublicByToken(token);
  }

  @Post('public/:token/registrar')
  registrarPublico(
    @Param('token') token: string,
    @Body() payload: RegistrarAsistenciaPublicaDto,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.registrarPublico(token, payload);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasDominicalesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAsistenciaDominicalDto,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.update(id, payload);
  }

  @Patch(':id/estado')
  setEstado(
    @Param('id') id: string,
    @Body() payload: { estado: EstadoAsistenciaDominical },
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.setEstado(id, payload.estado);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasDominicalesService.remove(id);
  }

  @Get(':id/registros')
  findRegistrosByAsistencia(
    @Param('id') id: string,
    @Query() query: ListRegistrosDominicalesQuery,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.findRegistrosByAsistencia(
      id,
      query,
    );
  }
}
