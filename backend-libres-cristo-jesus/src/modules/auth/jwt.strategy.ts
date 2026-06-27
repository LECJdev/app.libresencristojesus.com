import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rol } from '../../common/enums/rol.enum';
import { getPrimaryRole, normalizeRoles } from '../../common/utils/role.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super-secret-key',
    });
  }

  async validate(payload: { sub: string; rol?: Rol; roles?: Rol[] }) {
    const roles = normalizeRoles(payload);
    return {
      id: payload.sub,
      rol: getPrimaryRole({ roles, rol: payload.rol }),
      roles,
    };
  }
}
