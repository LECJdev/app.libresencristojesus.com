import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { CasasDePazService } from './casas-de-paz.service';
import { CasaDePaz } from './casa-de-paz.entity';
import {
  AdminDeleteAccess,
  CasaDePazReadAccess,
  CasaDePazWriteAccess,
} from '../auth/admin-access.decorator';
import { AuthenticatedUser } from '../../common/utils/role.util';

@Controller('casas-de-paz')
export class CasasDePazController {
  constructor(private readonly casasDePazService: CasasDePazService) {}

  @CasaDePazReadAccess()
  @Get()
  findAll(@Req() req: { user: AuthenticatedUser }): Promise<CasaDePaz[]> {
    return this.casasDePazService.findAll(req.user);
  }

  @CasaDePazReadAccess()
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<CasaDePaz> {
    return this.casasDePazService.findOne(id, req.user);
  }

  @CasaDePazWriteAccess()
  @Post()
  create(
    @Body() data: Partial<CasaDePaz>,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<CasaDePaz> {
    return this.casasDePazService.create(data, req.user);
  }

  @CasaDePazWriteAccess()
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<CasaDePaz>,
    @Req() req: { user: AuthenticatedUser },
  ): Promise<CasaDePaz> {
    return this.casasDePazService.update(id, data, req.user);
  }

  @AdminDeleteAccess()
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.casasDePazService.remove(id);
  }
}
