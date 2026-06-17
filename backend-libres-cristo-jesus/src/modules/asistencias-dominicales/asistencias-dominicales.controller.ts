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
  CompletePublicProfileDto,
  CreateAsistenciaDominicalDto,
  ListAsistenciasDominicalesQuery,
  ListRegistrosDominicalesQuery,
  RegistrarAsistenciaPublicaDto,
  UpdateAsistenciaDominicalDto,
} from './asistencias-dominicales.service';
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';
import {
  AdminDeleteAccess,
  AdminWriteAccess,
} from '../auth/admin-access.decorator';

@Controller('asistencias-dominicales')
export class AsistenciasDominicalesController {
  constructor(
    private readonly asistenciasDominicalesService: AsistenciasDominicalesService,
  ) {}

  @Get()
  findAll(@Query() query: ListAsistenciasDominicalesQuery): Promise<unknown> {
    return this.asistenciasDominicalesService.findAll(query);
  }

  @AdminWriteAccess()
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

  @Put('public/:token/completar-perfil')
  completePublicProfile(
    @Param('token') token: string,
    @Body() payload: CompletePublicProfileDto,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.completePublicProfile(token, payload);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.asistenciasDominicalesService.findOne(id);
  }

  @AdminWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateAsistenciaDominicalDto,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.update(id, payload);
  }

  @AdminWriteAccess()
  @Patch(':id/estado')
  setEstado(
    @Param('id') id: string,
    @Body() payload: { estado: EstadoAsistenciaDominical },
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.setEstado(id, payload.estado);
  }

  @AdminDeleteAccess()
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

  @Get(':id/registros/fechas')
  findFechasDisponiblesByAsistencia(
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.findFechasDisponiblesByAsistencia(
      id,
    );
  }

  @Get(':id/registros/resumen')
  findResumenByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.findResumenByAsistencia(id, fecha);
  }

  @Get(':id/registros/resumen-por-red')
  findResumenPorRedByAsistencia(
    @Param('id') id: string,
    @Query('fecha') fecha: string,
  ): Promise<unknown> {
    return this.asistenciasDominicalesService.findResumenPorRedByAsistencia(
      id,
      fecha,
    );
  }
}
