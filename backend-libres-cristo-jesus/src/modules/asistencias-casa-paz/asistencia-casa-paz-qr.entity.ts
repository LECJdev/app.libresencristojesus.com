import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { nanoid } from 'nanoid';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { DiaPredica } from '../../common/enums/dia-predica.enum';
import { EstadoAsistenciaCasaPaz } from '../../common/enums/estado-asistencia-casa-paz.enum';
import { Red } from '../redes/red.entity';

@Entity('asistencia_casa_paz_qr')
export class AsistenciaCasaPazQr extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({
    name: 'dia_registro',
    type: 'enum',
    enum: DiaPredica,
  })
  diaRegistro: DiaPredica;

  @Column({
    type: 'enum',
    enum: EstadoAsistenciaCasaPaz,
    default: EstadoAsistenciaCasaPaz.ACTIVO,
  })
  estado: EstadoAsistenciaCasaPaz;

  @Column({ name: 'qr_token', type: 'varchar', length: 120, unique: true })
  qrToken: string;

  @Column({ name: 'id_red', type: 'varchar', length: 50 })
  idRed: string;

  @Column({ name: 'direccion_casa', type: 'varchar', length: 255 })
  direccionCasa: string;

  @ManyToOne(() => Red, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_red' })
  red: Red;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_asist_casa_paz_qr_');
    }

    if (!this.qrToken) {
      this.qrToken = nanoid(28);
    }
  }
}
