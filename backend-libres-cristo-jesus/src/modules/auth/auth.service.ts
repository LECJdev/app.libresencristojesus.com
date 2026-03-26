import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PersonasService } from '../personas/personas.service';
import * as bcrypt from 'bcrypt';
import { Rol } from '../../common/enums/rol.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly personasService: PersonasService,
    private readonly jwtService: JwtService,
  ) {}

  async loginAdmin(celular: string, pass: string) {
    const persona = await this.personasService.findByCelular(celular);
    if (!persona) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isAuthorized = persona.rol === Rol.ADMIN || persona.rol === Rol.SUPER_ADMIN;
    if (!isAuthorized) {
      throw new UnauthorizedException('No tienes permisos para acceder al sistema');
    }

    if (!persona.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(pass, persona.password);
    if (!isMatch) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const payload = { sub: persona.id, rol: persona.rol };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: persona.id,
        nombres: persona.nombres,
        apellidos: persona.apellidos,
        rol: persona.rol,
      },
    };
  }
}
