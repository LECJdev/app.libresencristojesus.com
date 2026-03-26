import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @CreateDateColumn({
    name: 'fecha_creacion',
    type: 'timestamp',
    nullable: true,
  })
  fechaCreacion: Date | null;

  @UpdateDateColumn({
    name: 'fecha_modificacion',
    type: 'timestamp',
    nullable: true,
  })
  fechaModificacion: Date | null;
}
