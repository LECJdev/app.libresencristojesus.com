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
import { Distrito } from '../distritos/distrito.entity';
import { Dicipulado } from '../dicipulados/dicipulado.entity';
import { Persona } from '../personas/persona.entity';
import { Sede } from '../sedes/sede.entity';

@Entity('red')
export class Red extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre: string | null;

  @Column({ type: 'text', nullable: true })
  detalles: string | null;

  @Column({ name: 'id_sede', type: 'varchar', length: 50, nullable: true })
  idSede: string | null;

  @ManyToOne(() => Sede, (sede) => sede.redes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede | null;

  @OneToMany(() => Distrito, (distrito) => distrito.red)
  distritos: Distrito[];

  @OneToMany(() => Dicipulado, (disc) => disc.red)
  dicipulados: Dicipulado[];

  @OneToMany(() => Persona, (persona) => persona.red)
  personas: Persona[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_red_');
    }
  }
}
