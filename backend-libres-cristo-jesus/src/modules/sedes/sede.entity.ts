import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { Distrito } from '../distritos/distrito.entity';
import { AsistenciaNuevos } from '../asistencias/asistencia-nuevos.entity';

@Entity('sede')
export class Sede extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @OneToMany(() => Distrito, (distrito) => distrito.sede)
  distritos: Distrito[];

  @OneToMany(() => AsistenciaNuevos, (asist) => asist.sede)
  asistenciasNuevos: AsistenciaNuevos[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_sede_');
    }
  }
}
