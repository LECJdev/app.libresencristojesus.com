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
import { Lider } from '../lideres/lider.entity';
import { Dicipulado } from '../dicipulados/dicipulado.entity';

@Entity('lideres_x_dicipulado')
export class LiderDicipulado extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'id_lider', type: 'varchar', length: 50, nullable: true })
  idLider: string | null;

  @Column({
    name: 'id_dicipulado',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idDicipulado: string | null;

  @ManyToOne(() => Lider, (lider) => lider.lideresDicipulado, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_lider' })
  lider: Lider | null;

  @ManyToOne(() => Dicipulado, (disc) => disc.lideresDicipulado, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_dicipulado' })
  dicipulado: Dicipulado | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_lider_dicipulado_');
    }
  }
}
