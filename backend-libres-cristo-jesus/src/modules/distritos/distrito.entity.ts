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
import { Sede } from '../sedes/sede.entity';
import { Lider } from '../lideres/lider.entity';
import { CasaDePaz } from '../casas-de-paz/casa-de-paz.entity';
import { Dicipulado } from '../dicipulados/dicipulado.entity';

@Entity('distrito')
export class Distrito extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'id_sector', type: 'varchar', length: 50, nullable: true })
  idSector: string | null;

  @Column({ name: 'id_sede', type: 'varchar', length: 50, nullable: true })
  idSede: string | null;

  @ManyToOne(() => Red, (red) => red.distritos, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_sector' })
  red: Red;

  @ManyToOne(() => Sede, (sede) => sede.distritos, { nullable: true })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede | null;

  @OneToMany(() => Lider, (lider) => lider.distrito)
  lideres: Lider[];

  @OneToMany(() => CasaDePaz, (casa) => casa.distrito)
  casasDePaz: CasaDePaz[];

  @OneToMany(() => Dicipulado, (disc) => disc.distrito)
  dicipulados: Dicipulado[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_distrito_');
    }
  }
}
