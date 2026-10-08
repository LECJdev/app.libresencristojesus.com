import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { RecordStatus } from '@prisma/client';
import { CreatePersonDto } from './create-person.dto';

/**
 * `PATCH /people/:id` body.
 *
 * `version` is required (doc04 §14 optimistic locking) — `PeopleService`
 * rejects a stale one with 409.
 *
 * `peaceHouseId` here means "transfer": when it differs from the person's
 * current house, the service closes the open history period and opens a
 * new one, exactly as a Casa de Paz leadership change does. That is why it
 * carries a `transferReason` — a transfer without a stated reason is a
 * record nobody can interpret a year later.
 */
export class UpdatePersonDto extends CreatePersonDto {
  @ApiPropertyOptional({ enum: RecordStatus, description: 'Activación / desactivación.' })
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @ApiPropertyOptional({ description: 'Motivo del traslado de Casa de Paz.' })
  @IsOptional()
  transferReason?: string;

  @ApiProperty({ description: 'Debe coincidir con Person.version actual.' })
  @IsInt()
  @Min(1)
  version!: number;
}

/** `POST /people/:id/transfer` — mover a otra Casa de Paz sin tocar el resto. */
export class TransferPersonDto {
  @ApiProperty({ description: 'Casa de Paz destino.' })
  @IsUUID()
  peaceHouseId!: string;

  @ApiPropertyOptional({ description: 'Motivo del traslado.' })
  @IsOptional()
  transferReason?: string;
}
