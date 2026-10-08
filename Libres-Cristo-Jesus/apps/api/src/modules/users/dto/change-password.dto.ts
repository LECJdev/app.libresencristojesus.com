import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Min, MinLength } from 'class-validator';

/**
 * `PATCH /users/:id/password` body — kept separate from `UpdateUserDto`
 * per the task brief. Doc05 Rol 1 (Administrador) is the only role that
 * lists "Cambiar contraseñas" (plural — other users' passwords) as a
 * permission; every other role's own-password change is a distinct,
 * out-of-scope self-service flow that would belong to the Auth module
 * (untouched here). `UsersController` restricts this endpoint to that
 * Administrador-only permission (see `users.controller.ts`).
 */
export class ChangePasswordDto {
  @ApiProperty({ description: 'LeadershipMember.id whose password is being reset.' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ example: 'N3w-Str0ng-Password!' })
  @IsString()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({
    description: 'Optimistic locking counter — must match the current LeadershipUnit.version.',
  })
  @IsInt()
  @Min(1)
  version!: number;
}
