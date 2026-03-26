import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { Persona } from '../personas/persona.entity';
import { Evento } from '../eventos/evento.entity';

@Entity('asistencia_evento')
export class AsistenciaEvento {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @ManyToOne(() => Evento, (evento) => evento.asistencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  @ManyToOne(() => Persona, (persona) => persona.asistenciasEventos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'persona_id' })
  persona: Persona;

  @CreateDateColumn({ name: 'fecha_asistencia' })
  fechaAsistencia: Date;

  @Column({ type: 'jsonb', nullable: true })
  datosPersonalizados: any;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_asist_evt_');
    }
  }
}
