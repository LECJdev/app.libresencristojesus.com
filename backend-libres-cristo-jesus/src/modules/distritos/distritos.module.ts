import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Distrito } from './distrito.entity';
import { DistritosService } from './distritos.service';
import { DistritosController } from './distritos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Distrito])],
  controllers: [DistritosController],
  providers: [DistritosService],
  exports: [DistritosService],
})
export class DistritosModule {}
