import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CasasDePazService } from './casas-de-paz.service';
import { CasaDePaz } from './casa-de-paz.entity';

@Controller('casas-de-paz')
export class CasasDePazController {
  constructor(private readonly casasDePazService: CasasDePazService) {}

  @Get()
  findAll(): Promise<CasaDePaz[]> {
    return this.casasDePazService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CasaDePaz | null> {
    return this.casasDePazService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<CasaDePaz>): Promise<CasaDePaz> {
    return this.casasDePazService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<CasaDePaz>,
  ): Promise<CasaDePaz | null> {
    return this.casasDePazService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.casasDePazService.remove(id);
  }
}
