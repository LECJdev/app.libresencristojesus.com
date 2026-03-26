import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { TipoDocumento } from '../../common/enums/tipo-documento.enum';
import { Rol } from '../../common/enums/rol.enum';
import { Genero } from '../../common/enums/genero.enum';
import { Red } from '../redes/red.entity';
import { Lider } from '../lideres/lider.entity';
import { CasaDePaz } from '../casas-de-paz/casa-de-paz.entity';
import { Dicipulado } from '../dicipulados/dicipulado.entity';
import { AsistenciaCasaPaz } from '../asistencias/asistencia-casa-paz.entity';
import { AsistenciaNuevos } from '../asistencias/asistencia-nuevos.entity';
import { AsistenciaDicipulado } from '../asistencias/asistencia-dicipulado.entity';
import { AsistenciaEvento } from '../asistencias/asistencia-evento.entity';

@Entity('persona')
export class Persona extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombres: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  apellidos: string | null;

  @Column({ type: 'int', nullable: true })
  edad: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  celular: string | null;

  @Column({ type: 'enum', enum: TipoDocumento, nullable: true })
  tipoDocumento: TipoDocumento | null;

  @Column({ type: 'enum', enum: Genero, nullable: true })
  genero: Genero | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  correo: string | null;

  @Column({ type: 'boolean', nullable: true, default: false })
  encuentro: boolean | null;

  @Column({ type: 'enum', enum: Rol, default: Rol.INTEGRANTE })
  rol: Rol;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  barrio: string | null;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: string | null;

  @ManyToOne(() => Red, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'red_id' })
  red: Red | null;

  @ManyToOne(() => Persona, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitado_por_id' })
  invitadoPor: Persona | null;

  @OneToMany(() => Lider, (lider) => lider.persona)
  lideres: Lider[];

  @OneToMany(() => CasaDePaz, (casa) => casa.personaACargo)
  casasDePazACargo: CasaDePaz[];

  @OneToMany(() => Dicipulado, (disc) => disc.personaACargo)
  dicipuladosACargo: Dicipulado[];

  @OneToMany(() => AsistenciaCasaPaz, (asist) => asist.persona)
  asistenciasCasaPaz: AsistenciaCasaPaz[];

  @OneToMany(() => AsistenciaNuevos, (asist) => asist.persona)
  asistenciasNuevos: AsistenciaNuevos[];

  @OneToMany(() => AsistenciaNuevos, (asist) => asist.personaQuienInvito)
  invitaciones: AsistenciaNuevos[];

  @OneToMany(() => AsistenciaDicipulado, (asist) => asist.persona)
  asistenciasDicipulado: AsistenciaDicipulado[];

  @OneToMany(() => AsistenciaEvento, (asist) => asist.persona)
  asistenciasEventos: AsistenciaEvento[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_persona_');
    }
  }
}
