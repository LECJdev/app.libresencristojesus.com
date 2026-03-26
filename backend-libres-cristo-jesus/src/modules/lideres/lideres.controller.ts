import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { LideresService } from './lideres.service';
import { Lider } from './lider.entity';

@Controller('lideres')
export class LideresController {
  constructor(private readonly lideresService: LideresService) {}

  @Get()
  findAll(): Promise<Lider[]> {
    return this.lideresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Lider | null> {
    return this.lideresService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Lider>): Promise<Lider> {
    return this.lideresService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Lider>,
  ): Promise<Lider | null> {
    return this.lideresService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.lideresService.remove(id);
  }
}
