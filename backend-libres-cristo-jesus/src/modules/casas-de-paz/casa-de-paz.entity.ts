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
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { Persona } from '../personas/persona.entity';
import { Distrito } from '../distritos/distrito.entity';
import { LiderCasaDePaz } from '../lideres-casa-paz/lider-casa-paz.entity';
import { AsistenciaCasaPaz } from '../asistencias/asistencia-casa-paz.entity';

@Entity('casa_de_paz')
export class CasaDePaz extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @Column({ type: 'boolean', nullable: true, default: true })
  activa: boolean | null;

  @Column({
    name: 'dia_de_predica',
    type: 'enum',
    enum: DiaPredica,
    nullable: true,
  })
  diaDePredica: DiaPredica | null;

  @Column({
    name: 'id_persona_a_cargo',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idPersonaACargo: string | null;

  @Column({ name: 'id_distrito', type: 'varchar', length: 50, nullable: true })
  idDistrito: string | null;

  @Column({ name: 'qr_unico', type: 'varchar', length: 500, nullable: true })
  qrUnico: string | null;

  @ManyToOne(() => Persona, (persona) => persona.casasDePazACargo, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_persona_a_cargo' })
  personaACargo: Persona | null;

  @ManyToOne(() => Distrito, (distrito) => distrito.casasDePaz, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_distrito' })
  distrito: Distrito | null;

  @OneToMany(() => LiderCasaDePaz, (lcp) => lcp.casaDePaz)
  lideresCasaDePaz: LiderCasaDePaz[];

  @OneToMany(() => AsistenciaCasaPaz, (asist) => asist.casaDePaz)
  asistenciasCasaPaz: AsistenciaCasaPaz[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_casa_de_paz_');
    }
  }
}
