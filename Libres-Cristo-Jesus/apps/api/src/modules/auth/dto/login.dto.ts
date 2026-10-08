import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * `Documentos/19 – API Contract Book.md` section 2 shows the login
 * request body with an `email` field, but `LeadershipUnit` (the actual
 * login-credential-holding table, `Documentos/04-modelo-de-datos.md`
 * section 4) has no `email` column at all — only a unique `username`.
 * `email` lives on the *optional* `LeadershipMember` sub-records instead
 * (up to 2 per Unit), so it can never be the login identifier. This DTO
 * deliberately uses `username` instead, matching the real data model —
 * a documented deviation from doc19's literal (illustrative, not
 * schema-accurate) example.
 */
export class LoginDto {
  @ApiProperty({ example: 'pastor.principal', description: 'LeadershipUnit.username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: '********' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'When true, the refresh-token cookie persists for 7 days. When false (default), it is a session cookie cleared when the browser closes.',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
