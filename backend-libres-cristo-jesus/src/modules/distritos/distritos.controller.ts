import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DistritosService } from './distritos.service';
import { Distrito } from './distrito.entity';

@Controller('distritos')
export class DistritosController {
  constructor(private readonly distritosService: DistritosService) {}

  @Get()
  findAll(): Promise<Distrito[]> {
    return this.distritosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Distrito | null> {
    return this.distritosService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Distrito>): Promise<Distrito> {
    return this.distritosService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Distrito>,
  ): Promise<Distrito | null> {
    return this.distritosService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.distritosService.remove(id);
  }
}
