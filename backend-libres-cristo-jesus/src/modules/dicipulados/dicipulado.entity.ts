import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { Red } from '../redes/red.entity';
import { Distrito } from '../distritos/distrito.entity';
import { Persona } from '../personas/persona.entity';
import { LiderDicipulado } from '../lideres-dicipulado/lider-dicipulado.entity';
import { AsistenciaDicipulado } from '../asistencias/asistencia-dicipulado.entity';

@Entity('dicipulado')
export class Dicipulado extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @Column({ name: 'id_sector', type: 'varchar', length: 50, nullable: true })
  idSector: string | null;

  @Column({ name: 'id_distrito', type: 'varchar', length: 50, nullable: true })
  idDistrito: string | null;

  @Column({
    name: 'id_persona_a_cargo',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idPersonaACargo: string | null;

  @Column({ type: 'boolean', nullable: true, default: true })
  activa: boolean | null;

  @ManyToOne(() => Red, (red) => red.dicipulados, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_sector' })
  red: Red;

  @ManyToOne(() => Distrito, (distrito) => distrito.dicipulados, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_distrito' })
  distrito: Distrito | null;

  @ManyToOne(() => Persona, (persona) => persona.dicipuladosACargo, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_persona_a_cargo' })
  personaACargo: Persona | null;

  @OneToMany(() => LiderDicipulado, (ld) => ld.dicipulado)
  lideresDicipulado: LiderDicipulado[];

  @OneToMany(() => AsistenciaDicipulado, (asist) => asist.dicipulado)
  asistenciasDicipulado: AsistenciaDicipulado[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_dicipulado_');
    }
  }
}
