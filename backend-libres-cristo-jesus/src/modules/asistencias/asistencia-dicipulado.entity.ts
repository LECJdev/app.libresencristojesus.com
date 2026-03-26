import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { Dicipulado } from '../dicipulados/dicipulado.entity';
import { Persona } from '../personas/persona.entity';

@Entity('asistencia_dicipulado')
export class AsistenciaDicipulado extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({
    name: 'id_dicipulado',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idDicipulado: string | null;

  @Column({ name: 'id_persona', type: 'varchar', length: 50, nullable: true })
  idPersona: string | null;

  @Column({ type: 'timestamp', nullable: true })
  fecha: Date | null;

  @ManyToOne(() => Dicipulado, (disc) => disc.asistenciasDicipulado, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_dicipulado' })
  dicipulado: Dicipulado | null;

  @ManyToOne(() => Persona, (persona) => persona.asistenciasDicipulado, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_asist_dicipulado_');
    }
  }
}
