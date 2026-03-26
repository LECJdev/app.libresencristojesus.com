import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { RangosEspiritualesService } from './rangos-espirituales.service';
import { RangoEspiritual } from './rango-espiritual.entity';

@Controller('rangos-espirituales')
export class RangosEspiritualesController {
  constructor(
    private readonly rangosEspiritualesService: RangosEspiritualesService,
  ) {}

  @Get()
  findAll(): Promise<RangoEspiritual[]> {
    return this.rangosEspiritualesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<RangoEspiritual | null> {
    return this.rangosEspiritualesService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<RangoEspiritual>): Promise<RangoEspiritual> {
    return this.rangosEspiritualesService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<RangoEspiritual>,
  ): Promise<RangoEspiritual | null> {
    return this.rangosEspiritualesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.rangosEspiritualesService.remove(id);
  }
}
