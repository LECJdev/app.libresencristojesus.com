import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  AuthenticatedUserDto,
  LoginResponseDto,
  RefreshResponseDto,
} from './dto/authenticated-user.dto';
import { Public } from '../../common/security/decorators/public.decorator';
import { CurrentUser } from '../../common/security/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { AuditInterceptor } from '../../common/audit/audit.interceptor';
import { AppConfigService } from '../../common/config/app-config.service';
import type { JwtPayload } from '../../common/security/interfaces/jwt-payload.interface';
import type { RequestWithUser } from '../../common/security/guards/jwt-auth.guard';

/**
 * `UserSession` rows carry no explicit TTL field, but `TokenService` signs
 * refresh JWTs with their own expiry — this constant only bounds how long
 * the *cookie itself* survives on disk when `rememberMe` is true. Kept in
 * sync by convention with the refresh token's real lifetime; a mismatch
 * here only means the cookie disappears before/after the token would
 * anyway have been rejected, not a security issue either way.
 */
const REMEMBER_ME_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
/**
 * Scoped to `/auth` (not `/`) so the cookie is only ever sent back on the
 * three endpoints that actually need it (`refresh`, `logout`) — the
 * browser never attaches it to unrelated API calls.
 */
const REFRESH_TOKEN_COOKIE_PATH = '/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Audit('LeadershipUnit', 'LOGIN')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate with username/password and receive an access token.',
    description:
      'The refresh token is never returned in the response body — it is set as an httpOnly, ' +
      'secure (in production) cookie scoped to /auth, unreachable from client-side JS.',
  })
  @ApiResponse({ status: 200, description: 'Login successful.', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Malformed request body.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials, or the account is inactive.' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<{ accessToken: string; user: AuthenticatedUserDto }> {
    const result = await this.authService.login(dto, {
      ip: ip ?? null,
      browser: req.headers['user-agent'] ?? null,
    });

    // This route is @Public(), so JwtAuthGuard never runs and never
    // populates `request.user`. Attach it now — after authentication has
    // actually succeeded — purely so AuditInterceptor's entity/user id
    // resolution (see its `resolveEntityId` fallback) attributes this
    // LOGIN entry to the LeadershipUnit that just logged in.
    (req as RequestWithUser).user = {
      sub: result.user.id,
      memberId: result.memberId,
      username: result.user.username,
      role: result.user.role,
    };

    this.setRefreshTokenCookie(res, result.refreshToken, dto.rememberMe ?? false);

    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE_NAME)
  @ApiOperation({
    summary: 'Rotate the refresh token (read from the httpOnly cookie) for a new access token.',
    description:
      'The refresh token is read from the httpOnly `refreshToken` cookie set at login, never from ' +
      'the request body. On success the rotated refresh token is written back to that same cookie ' +
      'and only the new access token is returned in the body.',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed.', type: RefreshResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Refresh token cookie is missing, invalid, expired, or already used.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const presentedRefreshToken = this.extractRefreshTokenCookie(req);
    if (!presentedRefreshToken) {
      throw new UnauthorizedException('Missing refresh token cookie');
    }

    const result = await this.authService.refresh(presentedRefreshToken);

    // Rotation: the presented cookie's token is now dead server-side, so
    // the client's cookie must be overwritten with the new one or every
    // subsequent refresh would fail. `rememberMe` isn't known at this
    // point (no body/DTO on this route) — a persistent cookie stays
    // persistent across rotations by reusing the same max age.
    this.setRefreshTokenCookie(res, result.refreshToken, true);

    return { accessToken: result.accessToken };
  }

  @Audit('LeadershipUnit', 'LOGOUT')
  @UseInterceptors(AuditInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiBearerAuth()
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE_NAME)
  @ApiOperation({
    summary: 'Invalidate the session identified by the refresh token cookie.',
    description:
      'Reads the refresh token from the httpOnly `refreshToken` cookie and clears it on response.',
  })
  @ApiResponse({ status: 200, description: 'Session invalidated.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: null; message: string }> {
    const presentedRefreshToken = this.extractRefreshTokenCookie(req);
    if (presentedRefreshToken) {
      await this.authService.logout(presentedRefreshToken, user.memberId);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: REFRESH_TOKEN_COOKIE_PATH });
    return { data: null, message: 'Sesión cerrada correctamente.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Return the authenticated LeadershipUnit's profile." })
  @ApiResponse({ status: 200, description: 'Authenticated profile.', type: AuthenticatedUserDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async me(@CurrentUser() user: JwtPayload): Promise<AuthenticatedUserDto> {
    return this.authService.me(user.memberId);
  }

  /**
   * `secure: true` is forced in production regardless of `NODE_ENV`
   * mistakes elsewhere — an httpOnly cookie sent over plain HTTP is
   * exactly the kind of mistake this whole change exists to prevent.
   * `sameSite: 'lax'` allows the cookie on top-level navigations (e.g.
   * a normal same-site fetch/XHR from the SPA) while still blocking it
   * on cross-site requests, which is what CSRF protection needs here.
   * Omitting `maxAge` entirely (persistent === false) makes it a
   * session cookie the browser drops when it closes.
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string, persistent: boolean): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      ...(persistent ? { maxAge: REMEMBER_ME_COOKIE_MAX_AGE_MS } : {}),
    });
  }

  private extractRefreshTokenCookie(req: Request): string | undefined {
    const value: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    return typeof value === 'string' ? value : undefined;
  }
}
