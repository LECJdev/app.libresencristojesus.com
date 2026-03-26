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
import { Sede } from '../sedes/sede.entity';
import { Persona } from '../personas/persona.entity';

@Entity('asistencia_nuevos')
export class AsistenciaNuevos extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'id_sede', type: 'varchar', length: 50, nullable: true })
  idSede: string | null;

  @Column({ name: 'id_persona', type: 'varchar', length: 50, nullable: true })
  idPersona: string | null;

  @Column({
    name: 'id_persona_quien_la_invito',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idPersonaQuienLaInvito: string | null;

  @Column({ type: 'timestamp', nullable: true })
  fecha: Date | null;

  @ManyToOne(() => Sede, (sede) => sede.asistenciasNuevos, { nullable: true })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede | null;

  @ManyToOne(() => Persona, (persona) => persona.asistenciasNuevos, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona | null;

  @ManyToOne(() => Persona, (persona) => persona.invitaciones, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_persona_quien_la_invito' })
  personaQuienInvito: Persona | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_asist_nuevos_');
    }
  }
}
