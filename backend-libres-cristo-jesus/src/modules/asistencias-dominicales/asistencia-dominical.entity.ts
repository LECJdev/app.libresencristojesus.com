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
import { EstadoAsistenciaDominical } from '../../common/enums/estado-asistencia-dominical.enum';
import { Sede } from '../sedes/sede.entity';

@Entity('asistencia_dominical')
export class AsistenciaDominical extends BaseEntity {
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
    enum: EstadoAsistenciaDominical,
    default: EstadoAsistenciaDominical.ACTIVO,
  })
  estado: EstadoAsistenciaDominical;

  @Column({ name: 'qr_token', type: 'varchar', length: 120, unique: true })
  qrToken: string;

  @Column({ name: 'id_sede', type: 'varchar', length: 50 })
  idSede: string;

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_asist_dom_');
    }

    if (!this.qrToken) {
      this.qrToken = nanoid(28);
    }
  }
}
