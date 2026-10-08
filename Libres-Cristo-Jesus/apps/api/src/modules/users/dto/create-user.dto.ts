import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * One `LeadershipMember` nested under a `LeadershipUnit` create request
 * (doc02 RN-006/RN-008/RN-009: up to 2 members share one Unit account,
 * each with their own personal info/photo). `CreateUserDto.members` below
 * enforces the 1-2 cardinality; this DTO only validates a single member's
 * own fields (`Documentos/04-modelo-de-datos.md` section 4).
 */
export class CreateLeadershipMemberDto {
  @ApiProperty({ example: 'lider.carlos', description: 'Unique login username.' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: 'Str0ng-Password!',
    description: 'Initial password — hashed with argon2id before storage.',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  @IsNotEmpty()
  gender!: string;

  @ApiProperty({ required: false, nullable: true, example: '+503 7000-0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, nullable: true, example: 'carlos@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, nullable: true, description: 'Path to the stored photo file.' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false, nullable: true, example: '1990-05-20' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}

/**
 * `POST /users` body (doc19 section 8 "USERS"). Creates a `LeadershipUnit`
 * (the actual login-credential-holding row, doc04 section 4) together with
 * its 1-2 `LeadershipMember`s in one call — a Unit is never meaningfully
 * created without at least one member attached.
 *
 * `roleId` (not a `RoleName` string) mirrors the Prisma schema's real FK
 * column exactly — the target `CatRole` must already exist (seeded by
 * `prisma/seed.ts`); `UsersService` resolves it back to a `RoleName` to
 * enforce doc05's "who can create which role" rule.
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'Líder',
    description: 'Kind of leadership unit (doc04 §4 — free text, e.g. "Líder", "Pastor Distrito").',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ description: 'CatRole.id this LeadershipUnit is assigned.' })
  @IsUUID()
  roleId!: string;

  @ApiProperty({ type: [CreateLeadershipMemberDto], minItems: 1, maxItems: 2 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateLeadershipMemberDto)
  members!: CreateLeadershipMemberDto[];
}
