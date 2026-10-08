import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * `POST /permissions` body — adds one `(resource, action)` row to the
 * `Permission` catalog `ScopeGuard` reads (`Documentos/05-roles-y-permisos.md`).
 * `resource`/`action` together must be unique (`Permission`'s
 * `@@unique([resource, action])`, enforced in `PermissionsService.create`
 * with a friendly 409 before hitting the DB constraint).
 */
export class CreatePermissionDto {
  @ApiProperty({
    example: 'district',
    description: 'Resource/module this permission applies to (e.g. "user", "role", "district").',
  })
  @IsString()
  @IsNotEmpty()
  resource!: string;

  @ApiProperty({
    example: 'create',
    description:
      'Action allowed on the resource (e.g. "list", "read", "create", "update", "delete").',
  })
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiProperty({ required: false, nullable: true, example: 'district module — create' })
  @IsOptional()
  @IsString()
  description?: string;
}
