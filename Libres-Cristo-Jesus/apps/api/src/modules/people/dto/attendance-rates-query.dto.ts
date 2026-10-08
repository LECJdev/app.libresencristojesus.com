import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** `GET /people/attendance-rates` query params — the Casa de Paz is required, unlike `GET /people`. */
export class AttendanceRatesQueryDto {
  @ApiProperty({ description: 'Casa de Paz cuyo roster se calcula.' })
  @IsUUID()
  peaceHouseId!: string;
}
