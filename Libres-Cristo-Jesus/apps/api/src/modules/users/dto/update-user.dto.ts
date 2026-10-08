import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LeadershipUnitStatus } from '@prisma/client';
import { CreateLeadershipMemberDto } from './create-user.dto';

/**
 * A member row inside a `PATCH /users/:id` request. Presence of `id`
 * decides intent for `UsersService.update`: an existing member id updates
 * that row in place, an omitted id creates a new member. Any existing
 * member NOT present in the submitted `members` array is soft-deleted —
 * this DTO carries no explicit "delete" flag because omission already
 * expresses it unambiguously.
 */
/**
 * `CreateLeadershipMemberDto` minus `username`/`password` — TypeScript's
 * strict property variance forbids a subclass from narrowing an inherited
 * *required* field to optional via plain `extends` (TS2416), so those two
 * fields are omitted here and redeclared fresh below, the same way
 * `UpdateSermonThemeDto` uses `PartialType` elsewhere in this codebase.
 */
class UpdateLeadershipMemberBaseDto extends OmitType(CreateLeadershipMemberDto, [
  'username',
  'password',
] as const) {}

export class UpdateLeadershipMemberDto extends UpdateLeadershipMemberBaseDto {
  @ApiProperty({
    required: false,
    description: 'Omit to create a new member; provide to update an existing one.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  /**
   * Optional here (required on `CreateLeadershipMemberDto`). Business rule
   * enforced by `UsersService`, not class-validator: a NEW member (`id`
   * omitted) still requires both; an EXISTING member (`id` present) must
   * not send `password` at all (that goes through
   * `PATCH /users/:id/password`) and may optionally send `username` to
   * rename.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

/**
 * `PATCH /users/:id` body. Deliberately has NO `password` field (per the
 * task brief) — password changes go through the separate
 * `PATCH /users/:id/password` endpoint (`ChangePasswordDto`).
 *
 * `version` is required (not optional) on every update: `UsersService`
 * compares it against the current `LeadershipUnit.version` and rejects
 * with 409 on a mismatch (doc04 §13/§14 optimistic locking convention).
 */
export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, description: 'CatRole.id to reassign this LeadershipUnit to.' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({ required: false, enum: LeadershipUnitStatus })
  @IsOptional()
  @IsEnum(LeadershipUnitStatus)
  status?: LeadershipUnitStatus;

  @ApiProperty({ required: false, type: [UpdateLeadershipMemberDto], maxItems: 2 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => UpdateLeadershipMemberDto)
  members?: UpdateLeadershipMemberDto[];

  @ApiProperty({
    description: 'Optimistic locking counter — must match the current LeadershipUnit.version.',
  })
  @IsInt()
  @Min(1)
  version!: number;
}
