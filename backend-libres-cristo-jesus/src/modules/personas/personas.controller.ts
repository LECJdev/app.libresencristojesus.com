import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  PersonasService,
  CreateUserDto,
  PromotePersonalAdministrativoDto,
} from './personas.service';
import { Persona } from './persona.entity';
import {
  AdminDeleteAccess,
  AdminWriteAccess,
} from '../auth/admin-access.decorator';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  findAll(): Promise<Persona[]> {
    return this.personasService.findAll();
  }

  @Get('celular/:numero')
  findByCelular(@Param('numero') numero: string): Promise<Persona | null> {
    return this.personasService.findByCelular(numero);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Persona | null> {
    return this.personasService.findOne(id);
  }

  @AdminWriteAccess()
  @Post()
  create(@Body() data: Partial<Persona>): Promise<Persona> {
    return this.personasService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.SUPER_ADMIN)
  @Post('admin/crear')
  createUser(@Body() dto: CreateUserDto) {
    return this.personasService.createUser(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.SUPER_ADMIN)
  @Post('admin/promover-personal-administrativo')
  promotePersonalAdministrativo(@Body() dto: PromotePersonalAdministrativoDto) {
    return this.personasService.promoteToPersonalAdministrativo(dto);
  }

  @AdminWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Persona>,
  ): Promise<Persona | null> {
    return this.personasService.update(id, data);
  }

  @AdminDeleteAccess()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.personasService.remove(id);
  }
}
