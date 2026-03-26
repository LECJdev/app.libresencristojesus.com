import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiderCasaDePaz } from './lider-casa-paz.entity';
import { LideresCasaPazService } from './lideres-casa-paz.service';
import { LideresCasaPazController } from './lideres-casa-paz.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LiderCasaDePaz])],
  controllers: [LideresCasaPazController],
  providers: [LideresCasaPazService],
  exports: [LideresCasaPazService],
})
export class LideresCasaPazModule {}
