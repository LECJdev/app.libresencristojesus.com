import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';

export class LoginAdminDto {
  identifier?: string;
  correo?: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async loginAdmin(@Body() body: LoginAdminDto) {
    const identifier = body.identifier ?? body.correo;

    if (!identifier || !body.password) {
      throw new UnauthorizedException('Credenciales incompletas');
    }
    return await this.authService.loginAdmin(identifier, body.password);
  }
}
