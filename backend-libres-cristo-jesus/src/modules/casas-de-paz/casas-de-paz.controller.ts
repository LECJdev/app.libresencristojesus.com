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
import {
  AdminDeleteAccess,
  AdminWriteAccess,
} from '../auth/admin-access.decorator';

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

  @AdminWriteAccess()
  @Post()
  create(@Body() data: Partial<CasaDePaz>): Promise<CasaDePaz> {
    return this.casasDePazService.create(data);
  }

  @AdminWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<CasaDePaz>,
  ): Promise<CasaDePaz | null> {
    return this.casasDePazService.update(id, data);
  }

  @AdminDeleteAccess()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.casasDePazService.remove(id);
  }
}
