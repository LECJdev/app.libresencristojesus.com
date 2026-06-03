import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DicipuladosService } from './dicipulados.service';
import { Dicipulado } from './dicipulado.entity';
import {
  AdminDeleteAccess,
  AdminWriteAccess,
} from '../auth/admin-access.decorator';

@Controller('dicipulados')
export class DicipuladosController {
  constructor(private readonly dicipuladosService: DicipuladosService) {}

  @Get()
  findAll(): Promise<Dicipulado[]> {
    return this.dicipuladosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Dicipulado | null> {
    return this.dicipuladosService.findOne(id);
  }

  @AdminWriteAccess()
  @Post()
  create(@Body() data: Partial<Dicipulado>): Promise<Dicipulado> {
    return this.dicipuladosService.create(data);
  }

  @AdminWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Dicipulado>,
  ): Promise<Dicipulado | null> {
    return this.dicipuladosService.update(id, data);
  }

  @AdminDeleteAccess()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.dicipuladosService.remove(id);
  }
}
