import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { LideresCasaPazService } from './lideres-casa-paz.service';
import { LiderCasaDePaz } from './lider-casa-paz.entity';

@Controller('lideres-casa-paz')
export class LideresCasaPazController {
  constructor(private readonly lideresCasaPazService: LideresCasaPazService) {}

  @Get()
  findAll(): Promise<LiderCasaDePaz[]> {
    return this.lideresCasaPazService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<LiderCasaDePaz | null> {
    return this.lideresCasaPazService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<LiderCasaDePaz>): Promise<LiderCasaDePaz> {
    return this.lideresCasaPazService.create(data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.lideresCasaPazService.remove(id);
  }
}
