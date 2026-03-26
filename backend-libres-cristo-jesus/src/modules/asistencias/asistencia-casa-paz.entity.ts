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
import { Persona } from '../personas/persona.entity';

@Entity('asistencia_casa_paz')
export class AsistenciaCasaPaz extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'timestamp', nullable: true })
  fecha: Date | null;

  @Column({
    name: 'id_casa_de_paz',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idCasaDePaz: string | null;

  @Column({ name: 'id_persona', type: 'varchar', length: 50, nullable: true })
  idPersona: string | null;

  @ManyToOne(() => CasaDePaz, (casa) => casa.asistenciasCasaPaz, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_casa_de_paz' })
  casaDePaz: CasaDePaz | null;

  @ManyToOne(() => Persona, (persona) => persona.asistenciasCasaPaz, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_asist_casa_paz_');
    }
  }
}
