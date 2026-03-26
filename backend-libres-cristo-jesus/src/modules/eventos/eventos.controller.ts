import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EventosService } from './eventos.service';
import { Evento } from './evento.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';

@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  findAll(): Promise<Evento[]> {
    return this.eventosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Evento> {
    return this.eventosService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPER_ADMIN)
  @Post()
  create(@Body() data: Partial<Evento>): Promise<Evento> {
    return this.eventosService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPER_ADMIN)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Evento>,
  ): Promise<Evento> {
    return this.eventosService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.eventosService.remove(id);
  }
}
