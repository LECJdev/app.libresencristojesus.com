import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { Lider } from '../lideres/lider.entity';

@Entity('rango_espiritual')
export class RangoEspiritual extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombre: string | null;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @OneToMany(() => Lider, (lider) => lider.rangoEspiritual)
  lideres: Lider[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_rango_espiritual_');
    }
  }
}
