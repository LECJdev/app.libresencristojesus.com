import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  CASA_DE_PAZ_ACCESS_ROLES,
  ADMIN_WRITE_ROLES,
  ADMIN_DELETE_ROLES,
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

export function AdminReadAccess() {
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

export function CasaDePazReadAccess() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...CASA_DE_PAZ_ACCESS_ROLES),
  );
}

export function CasaDePazWriteAccess() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...CASA_DE_PAZ_ACCESS_ROLES),
  );
}
