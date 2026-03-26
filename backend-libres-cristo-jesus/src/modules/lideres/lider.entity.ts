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
import { Persona } from '../personas/persona.entity';
import { Distrito } from '../distritos/distrito.entity';
import { RangoEspiritual } from '../rangos-espirituales/rango-espiritual.entity';
import { LiderCasaDePaz } from '../lideres-casa-paz/lider-casa-paz.entity';
import { LiderDicipulado } from '../lideres-dicipulado/lider-dicipulado.entity';

@Entity('lider')
export class Lider extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'id_persona', type: 'varchar', length: 50, nullable: true })
  idPersona: string | null;

  @Column({ name: 'id_distrito', type: 'varchar', length: 50, nullable: true })
  idDistrito: string | null;

  @Column({
    name: 'id_rango_espiritual',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idRangoEspiritual: string | null;

  @ManyToOne(() => Persona, (persona) => persona.lideres, { nullable: true })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona | null;

  @ManyToOne(() => Distrito, (distrito) => distrito.lideres, { nullable: true })
  @JoinColumn({ name: 'id_distrito' })
  distrito: Distrito | null;

  @ManyToOne(() => RangoEspiritual, (rango) => rango.lideres, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_rango_espiritual' })
  rangoEspiritual: RangoEspiritual | null;

  @OneToMany(() => LiderCasaDePaz, (lcp) => lcp.lider)
  lideresCasaDePaz: LiderCasaDePaz[];

  @OneToMany(() => LiderDicipulado, (ld) => ld.lider)
  lideresDicipulado: LiderDicipulado[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_lider_');
    }
  }
}
