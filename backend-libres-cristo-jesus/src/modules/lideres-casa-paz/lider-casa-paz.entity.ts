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
import { CasaDePaz } from '../casas-de-paz/casa-de-paz.entity';
import { Lider } from '../lideres/lider.entity';

@Entity('lideres_x_casa_de_paz')
export class LiderCasaDePaz extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({
    name: 'id_casa_de_paz',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idCasaDePaz: string | null;

  @Column({ name: 'id_lider', type: 'varchar', length: 50, nullable: true })
  idLider: string | null;

  @ManyToOne(() => CasaDePaz, (casa) => casa.lideresCasaDePaz, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_casa_de_paz' })
  casaDePaz: CasaDePaz | null;

  @ManyToOne(() => Lider, (lider) => lider.lideresCasaDePaz, { nullable: true })
  @JoinColumn({ name: 'id_lider' })
  lider: Lider | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_lider_casa_paz_');
    }
  }
}
