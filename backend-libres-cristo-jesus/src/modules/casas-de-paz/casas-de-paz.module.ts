import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasaDePaz } from './casa-de-paz.entity';
import { CasasDePazService } from './casas-de-paz.service';
import { CasasDePazController } from './casas-de-paz.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CasaDePaz])],
  controllers: [CasasDePazController],
  providers: [CasasDePazService],
  exports: [CasasDePazService],
})
export class CasasDePazModule {}
