import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lider } from './lider.entity';
import { LideresService } from './lideres.service';
import { LideresController } from './lideres.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lider])],
  controllers: [LideresController],
  providers: [LideresService],
  exports: [LideresService],
})
export class LideresModule {}
