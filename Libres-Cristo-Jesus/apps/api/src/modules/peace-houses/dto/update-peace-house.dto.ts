import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

/**
 * `PATCH /peace-houses/:id` body. `version` is required (not optional), matching
 * `UpdateDistrictDto`'s convention (doc04 §13/§14 optimistic locking):
 * `PeaceHousesService.update` compares it against the current `PeaceHouse.version` and
 * rejects with 409 on a mismatch.
 *
 * When `districtId`/`name` are both touched, or `leadershipUnitId` is touched,
 * `PeaceHousesService.update` re-runs the same validations `create` does (District active,
 * `(districtId, name)` still unique, `leadershipUnitId` role is "Líder" and not already
 * leading another active Casa de Paz) — see the service's doc comment.
 */
export class UpdatePeaceHouseDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  leadershipUnitId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, nullable: true, description: 'UUID of a CatDepartment.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'UUID of a CatMunicipality. Must belong to the effective departmentId.',
  })
  @IsOptional()
  @IsUUID()
  municipalityId?: string;

  @ApiProperty({ required: false, nullable: true, example: 'CP-09-004' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, nullable: true, example: 6.244203 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ required: false, nullable: true, example: -75.581215 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  meetingDay?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '19:00',
    description: '24h HH:mm format.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'meetingHour must be in 24h HH:mm format (e.g. "19:00")',
  })
  meetingHour?: string;

  @ApiProperty({
    description: 'Optimistic locking counter — must match the current PeaceHouse.version.',
  })
  @IsInt()
  @Min(1)
  version!: number;
}
