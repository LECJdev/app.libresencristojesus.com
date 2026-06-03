import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ADMIN_DELETE_ROLES,
  ADMIN_WRITE_ROLES,
} from '../../common/enums/rol.enum';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

export function AdminWriteAccess() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...ADMIN_WRITE_ROLES),
  );
}

export function AdminDeleteAccess() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...ADMIN_DELETE_ROLES),
  );
}
