import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { AsistenciaEvento } from '../asistencias/asistencia-evento.entity';

export enum EstadoEvento {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

@Entity('evento')
export class Evento extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'enum', enum: EstadoEvento, default: EstadoEvento.ACTIVO })
  estado: EstadoEvento;

  @Column({ type: 'boolean', default: true })
  generaQr: boolean;

  @Column({ type: 'jsonb', nullable: true })
  camposPersonalizados: any;

  @OneToMany(() => AsistenciaEvento, (asist) => asist.evento)
  asistencias: AsistenciaEvento[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_event_');
    }
  }
}
