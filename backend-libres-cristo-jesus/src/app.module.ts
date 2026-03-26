import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Módulos
import { RangosEspiritualesModule } from './modules/rangos-espirituales/rangos-espirituales.module';
import { PersonasModule } from './modules/personas/personas.module';
import { SedesModule } from './modules/sedes/sedes.module';
import { RedesModule } from './modules/redes/redes.module';
import { DistritosModule } from './modules/distritos/distritos.module';
import { LideresModule } from './modules/lideres/lideres.module';
import { CasasDePazModule } from './modules/casas-de-paz/casas-de-paz.module';
import { DicipuladosModule } from './modules/dicipulados/dicipulados.module';
import { LideresCasaPazModule } from './modules/lideres-casa-paz/lideres-casa-paz.module';
import { LideresDicipuladoModule } from './modules/lideres-dicipulado/lideres-dicipulado.module';
import { AsistenciasModule } from './modules/asistencias/asistencias.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { AuthModule } from './modules/auth/auth.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: true,
          migrations: ['dist/migrations/*{.ts,.js}'],
        };
      },
    }),
    // Módulos de dominio
    RangosEspiritualesModule,
    PersonasModule,
    SedesModule,
    RedesModule,
    DistritosModule,
    LideresModule,
    CasasDePazModule,
    DicipuladosModule,
    LideresCasaPazModule,
    LideresDicipuladoModule,
    AsistenciasModule,
    EventosModule,
    AuthModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
