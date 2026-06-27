import {
  BeforeInsert,
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { generateCustomId } from '../../common/utils/id-generator.util';
import { AsistenciaCasaPazQr } from './asistencia-casa-paz-qr.entity';

@Entity('casa_paz_sesion')
@Index(
  'UQ_casa_paz_sesion_asistencia_fecha',
  ['idAsistenciaCasaPazQr', 'fecha'],
  {
    unique: true,
  },
)
@Index('IDX_casa_paz_sesion_asistencia', ['idAsistenciaCasaPazQr'])
@Index('IDX_casa_paz_sesion_fecha', ['fecha'])
@Check('CHK_casa_paz_sesion_monto_ofrenda_non_negative', 'monto_ofrenda >= 0')
export class CasaPazSesion extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'id_asistencia_casa_paz_qr', type: 'varchar', length: 50 })
  idAsistenciaCasaPazQr: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({
    name: 'monto_ofrenda',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value?: number | null) => value ?? 0,
      from: (value: string | number | null) =>
        value === null ? 0 : Number(value),
    },
  })
  montoOfrenda: number;

  @ManyToOne(() => AsistenciaCasaPazQr, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_asistencia_casa_paz_qr' })
  asistencia: AsistenciaCasaPazQr;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateCustomId('id_casa_paz_sesion_');
    }
  }
}
