import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { SyncOperationStatus, SyncOperationType } from '@lcj/types';

/** Los tipos que el ejecutor sabe aplicar. Cerrado a propósito. */
const OPERATION_TYPES: SyncOperationType[] = [
  'ATTENDANCE_MARK',
  'ATTENDANCE_MARK_ALL',
  'PERSON_CREATE',
  'MEETING_REPORT',
  'OFFERING_UPSERT',
  'MEETING_PHOTO_ADD',
];

/**
 * Tope por lote. Un dispositivo que estuvo una semana sin señal manda
 * decenas de operaciones, no miles — y un lote sin techo permitiría agotar
 * la memoria del servidor con una sola petición.
 */
const MAX_BATCH_SIZE = 200;

export class SyncOperationDto {
  @ApiProperty({ description: 'UUID generado por el dispositivo. Clave de idempotencia.' })
  @IsUUID()
  operationId!: string;

  @ApiProperty({ required: false, description: 'Reunión afectada, si aplica.' })
  @IsOptional()
  @IsUUID()
  meetingId?: string;

  @ApiProperty({ description: 'Identificador estable del dispositivo.' })
  @IsString()
  @MaxLength(200)
  deviceId!: string;

  @ApiProperty({
    description:
      'Cuándo se realizó realmente, ISO-8601. El bloqueo semanal se evalúa contra ESTA fecha, nunca contra la de llegada (Regla 3).',
  })
  @IsDateString()
  createdOfflineAt!: string;

  @ApiProperty({ enum: OPERATION_TYPES })
  @IsIn(OPERATION_TYPES)
  operationType!: SyncOperationType;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class SyncBatchDto {
  @ApiProperty({ type: () => [SyncOperationDto] })
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}

export class SyncOperationResultDto {
  @ApiProperty() operationId!: string;
  @ApiProperty({ enum: ['APPLIED', 'DUPLICATE', 'REJECTED', 'CONFLICT'] })
  status!: SyncOperationStatus;
  @ApiProperty({ description: 'Explicación en español, mostrable al usuario.' })
  message!: string;
}

export class SyncBatchResultDto {
  @ApiProperty({ type: () => [SyncOperationResultDto] })
  results!: SyncOperationResultDto[];
  @ApiProperty() applied!: number;
  @ApiProperty() duplicated!: number;
  @ApiProperty() rejected!: number;
  @ApiProperty() conflicted!: number;
}
