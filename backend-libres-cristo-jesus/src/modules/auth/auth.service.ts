import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PersonasService } from '../personas/personas.service';
import * as bcrypt from 'bcrypt';
import { CASA_DE_PAZ_ACCESS_ROLES, Rol } from '../../common/enums/rol.enum';
import { sanitizeOptionalEmail } from '../../common/utils/input-security.util';
import {
  getPrimaryRole,
  hasAnyRole,
  normalizeRoles,
} from '../../common/utils/role.util';

type AdminLoginPrincipal = {
  id: string;
  nombres?: string | null;
  apellidos?: string | null;
  rol: Rol;
  roles?: Rol[] | null;
  password?: string | null;
};

const DEFAULT_LEGACY_SUPER_ADMIN_USERNAME = 'useroot';
const DEFAULT_LEGACY_SUPER_ADMIN_PASSWORD = 'librespass@26';
const DEFAULT_LEGACY_SUPER_ADMIN_ID = 'legacy-super-admin';

@Injectable()
export class AuthService {
  constructor(
    private readonly personasService: PersonasService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async loginAdmin(identifier: string, pass: string) {
    const legacySuperAdmin = this.getLegacySuperAdminCredentials();
    const normalizedIdentifier = identifier?.trim();

    if (
      this.isLegacySuperAdminUsername(
        normalizedIdentifier,
        legacySuperAdmin.username,
      )
    ) {
      if (pass !== legacySuperAdmin.password) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }

      return this.buildLoginResponse({
        id: legacySuperAdmin.id,
        nombres: 'Legacy',
        apellidos: 'Super Admin',
        rol: Rol.SUPER_ADMIN,
        roles: [Rol.SUPER_ADMIN],
      });
    }

    const persona = await this.findPersonaForLogin(normalizedIdentifier);
    if (!persona) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isAuthorized = hasAnyRole(persona, CASA_DE_PAZ_ACCESS_ROLES);
    if (!isAuthorized) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder al sistema',
      );
    }

    if (!persona.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(pass, persona.password);
    if (!isMatch) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return this.buildLoginResponse(persona);
  }

  private buildLoginResponse(persona: AdminLoginPrincipal) {
    const roles = normalizeRoles(persona);
    const rol = getPrimaryRole({ roles, rol: persona.rol });
    const payload = { sub: persona.id, rol, roles };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: persona.id,
        nombres: persona.nombres ?? '',
        apellidos: persona.apellidos ?? '',
        rol,
        roles,
      },
    };
  }

  private getLegacySuperAdminCredentials() {
    return {
      username:
        this.configService.get<string>('LEGACY_SUPER_ADMIN_USERNAME') ||
        DEFAULT_LEGACY_SUPER_ADMIN_USERNAME,
      password:
        this.configService.get<string>('LEGACY_SUPER_ADMIN_PASSWORD') ||
        DEFAULT_LEGACY_SUPER_ADMIN_PASSWORD,
      id:
        this.configService.get<string>('LEGACY_SUPER_ADMIN_ID') ||
        DEFAULT_LEGACY_SUPER_ADMIN_ID,
    };
  }

  private isLegacySuperAdminUsername(
    identifier: string | undefined,
    legacyUsername: string,
  ) {
    return identifier?.toLowerCase() === legacyUsername.trim().toLowerCase();
  }

  private async findPersonaForLogin(identifier?: string) {
    const normalizedIdentifier = identifier?.trim();
    if (!normalizedIdentifier) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const normalizedCorreo = sanitizeOptionalEmail(normalizedIdentifier);
    if (!normalizedCorreo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.personasService.findByCorreo(normalizedCorreo);
  }
}
