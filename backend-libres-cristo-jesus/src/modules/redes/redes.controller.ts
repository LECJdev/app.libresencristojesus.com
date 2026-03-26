import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { RedesService } from './redes.service';
import { Red } from './red.entity';

@Controller('redes')
export class RedesController {
  constructor(private readonly redesService: RedesService) {}

  @Get()
  findAll(): Promise<Red[]> {
    return this.redesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Red | null> {
    return this.redesService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Red>): Promise<Red> {
    return this.redesService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Red>,
  ): Promise<Red | null> {
    return this.redesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.redesService.remove(id);
  }
}
