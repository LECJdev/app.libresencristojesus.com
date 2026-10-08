import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './common/config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Replace Nest's default console logger with the Pino-backed one
  // (doc21: structured JSON logs, never console.log) for every log Nest
  // itself emits (bootstrap messages, lifecycle events, etc.). This one
  // stays imperative here (rather than an APP_* token): it must be set
  // before Nest's own early bootstrap logging happens, and — unlike
  // guards/filters/interceptors/pipes — a test bootstrapping AppModule
  // without it just falls back to Nest's default logger, it doesn't
  // silently lose behavior that matters to what's being tested.
  app.useLogger(app.get(Logger));

  // Guards, the exception filter, interceptors, and the validation pipe
  // are registered globally via APP_GUARD/APP_FILTER/APP_INTERCEPTOR/
  // APP_PIPE tokens in CommonModule (see its docstring for why), not here.

  const configService = app.get(AppConfigService);

  // `credentials: true` + an explicit (non-`*`) origin is required for the
  // browser to send/accept the httpOnly refresh-token cookie set by
  // POST /auth/login and /auth/refresh — a wildcard origin is rejected by
  // browsers whenever `credentials` is involved.
  app.enableCors({ origin: configService.frontendUrl, credentials: true });

  // Parses the `refreshToken` cookie into `req.cookies` for the auth
  // controller — the refresh token now travels exclusively as an
  // httpOnly cookie, never in a JSON body, so it's never reachable from
  // client-side JS.
  app.use(cookieParser());

  await app.listen(configService.apiPort);
}
void bootstrap();
