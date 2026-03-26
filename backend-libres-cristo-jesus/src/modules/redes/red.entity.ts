import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { Distrito } from '../distritos/distrito.entity';
import { Dicipulado } from '../dicipulados/dicipulado.entity';

@Entity('red')
export class Red extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre: string | null;

  @Column({ type: 'text', nullable: true })
  detalles: string | null;

  @OneToMany(() => Distrito, (distrito) => distrito.red)
  distritos: Distrito[];

  @OneToMany(() => Dicipulado, (disc) => disc.red)
  dicipulados: Dicipulado[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_red_');
    }
  }
}
