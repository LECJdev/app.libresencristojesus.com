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
import { EstadoAsistenciaDicipulado } from '../../common/enums/estado-asistencia-dicipulado.enum';
import { Sede } from '../sedes/sede.entity';
import { Red } from '../redes/red.entity';

@Entity('asistencia_dicipulado_qr')
export class AsistenciaDicipuladoQr extends BaseEntity {
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
    enum: EstadoAsistenciaDicipulado,
    default: EstadoAsistenciaDicipulado.ACTIVO,
  })
  estado: EstadoAsistenciaDicipulado;

  @Column({ name: 'qr_token', type: 'varchar', length: 120, unique: true })
  qrToken: string;

  @Column({ name: 'id_sede', type: 'varchar', length: 50, nullable: true })
  idSede: string | null;

  @Column({
    name: 'direccion_personalizada',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  direccionPersonalizada: string | null;

  @Column({ name: 'id_red', type: 'varchar', length: 50, nullable: true })
  idRed: string | null;

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede | null;

  @ManyToOne(() => Red, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_red' })
  red: Red | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_asist_discip_qr_');
    }

    if (!this.qrToken) {
      this.qrToken = nanoid(28);
    }
  }
}
