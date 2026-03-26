import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { LideresDicipuladoService } from './lideres-dicipulado.service';
import { LiderDicipulado } from './lider-dicipulado.entity';

@Controller('lideres-dicipulado')
export class LideresDicipuladoController {
  constructor(
    private readonly lideresDicipuladoService: LideresDicipuladoService,
  ) {}

  @Get()
  findAll(): Promise<LiderDicipulado[]> {
    return this.lideresDicipuladoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<LiderDicipulado | null> {
    return this.lideresDicipuladoService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<LiderDicipulado>): Promise<LiderDicipulado> {
    return this.lideresDicipuladoService.create(data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.lideresDicipuladoService.remove(id);
  }
}
