import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * `PATCH /districts/:id` body. `version` is required (not optional), matching
 * `UpdateOrganizationDto`/`UpdateUserDto`'s convention (doc04 §13/§14 optimistic
 * locking): `DistrictsService.update` compares it against the current
 * `District.version` and rejects with 409 on a mismatch.
 *
 * When `churchId`/`number` are both touched, or `leadershipUnitId` is touched,
 * `DistrictsService.update` re-runs the same validations `create` does (Church
 * active, `(churchId, number)` still unique, `leadershipUnitId` role is "Pastor
 * Distrito") — see the service's doc comment.
 */
export class UpdateDistrictDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  churchId?: string;

  @ApiProperty({ required: false, example: 9 })
  @IsOptional()
  @IsInt()
  @Min(1)
  number?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  leadershipUnitId?: string;

  @ApiProperty({
    description: 'Optimistic locking counter — must match the current District.version.',
  })
  @IsInt()
  @Min(1)
  version!: number;
}
