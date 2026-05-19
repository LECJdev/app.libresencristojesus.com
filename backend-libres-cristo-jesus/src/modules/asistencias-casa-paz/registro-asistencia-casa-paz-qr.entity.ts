import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { AsistenciaCasaPazQr } from './asistencia-casa-paz-qr.entity';
import { Persona } from '../personas/persona.entity';

@Entity('registro_asistencia_casa_paz_qr')
@Index(
  'UQ_registro_asistencia_casa_paz_qr_persona_fecha',
  ['idAsistencia', 'idPersona', 'fechaRegistro'],
  {
    unique: true,
  },
)
export class RegistroAsistenciaCasaPazQr extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'fecha_registro', type: 'date' })
  fechaRegistro: string;

  @Column({ name: 'es_nuevo', type: 'boolean', default: false })
  esNuevo: boolean;

  @Column({ name: 'id_asistencia', type: 'varchar', length: 50 })
  idAsistencia: string;

  @Column({ name: 'id_persona', type: 'varchar', length: 50 })
  idPersona: string;

  @ManyToOne(() => AsistenciaCasaPazQr, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_asistencia' })
  asistencia: AsistenciaCasaPazQr;

  @ManyToOne(() => Persona, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_reg_asist_casa_paz_qr_');
    }
  }
}
