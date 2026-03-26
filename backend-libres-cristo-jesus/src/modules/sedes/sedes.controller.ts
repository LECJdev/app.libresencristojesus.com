import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SedesService } from './sedes.service';
import { Sede } from './sede.entity';

@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Get()
  findAll(): Promise<Sede[]> {
    return this.sedesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Sede | null> {
    return this.sedesService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Sede>): Promise<Sede> {
    return this.sedesService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Sede>,
  ): Promise<Sede | null> {
    return this.sedesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.sedesService.remove(id);
  }
}
