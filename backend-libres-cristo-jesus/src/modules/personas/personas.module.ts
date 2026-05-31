import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from './persona.entity';
import { PersonasService } from './personas.service';
import { PersonasController } from './personas.controller';
import { Red } from '../redes/red.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Persona, Red])],
  controllers: [PersonasController],
  providers: [PersonasService],
  exports: [PersonasService],
})
export class PersonasModule {}
