import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';

/**
 * Structured JSON logging (doc21 "Logs estructurados en JSON:
 * {timestamp, level, userId, module, message, traceId}"), via
 * `nestjs-pino` instead of Nest's default console logger — wired as the
 * app's logger in `main.ts` (`app.useLogger(app.get(Logger))`).
 *
 * Field-by-field:
 * - `traceId`: pino-http's `genReqId` returns the incoming
 *   `X-Request-Id` header if present, otherwise generates one with
 *   `crypto.randomUUID()`, and echoes it back on the response header.
 *   `customAttributeKeys` renames pino-http's default `reqId` key to
 *   `traceId` for pino-http's OWN auto-generated log line — but that
 *   line is disabled below (`autoLogging: false`), so in practice the
 *   top-level `traceId` field on every app log line comes from
 *   `LoggingInterceptor`/`AllExceptionsFilter` explicitly reading
 *   `request.id` (the same value `genReqId` produced) and either
 *   `assign()`-ing or logging it directly — otherwise it's only
 *   available nested as `req.id` via pino-http's default request
 *   serializer, not as a clean top-level key. `customAttributeKeys` is
 *   still kept so the raw key stays consistent if `autoLogging` is ever
 *   re-enabled (e.g. for local debugging).
 * - `module`: `renameContext` renames the default `context` key (Nest's
 *   usual logger-context convention, e.g. a class name) to `module`.
 * - `userId`: not known until `JwtAuthGuard` runs, so it isn't set here
 *   — `LoggingInterceptor`/`AllExceptionsFilter` set it once the
 *   request's user (if any) is known (`null` otherwise).
 * - `timestamp`/`level`/`message`: pino defaults renamed/reshaped via
 *   `timestamp`, `formatters.level` and `messageKey` below.
 *
 * `autoLogging` is disabled: `LoggingInterceptor` (point 17) is the
 * single source of the per-request access log line, so we don't get a
 * duplicate line from pino-http's own automatic request/response log.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        renameContext: 'module',
        pinoHttp: {
          level: configService.isProduction ? 'info' : 'debug',
          autoLogging: false,
          messageKey: 'message',
          customAttributeKeys: {
            reqId: 'traceId',
          },
          genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const header = req.headers['x-request-id'];
            const incoming = Array.isArray(header) ? header[0] : header;
            const traceId = incoming && incoming.length > 0 ? incoming : randomUUID();
            res.setHeader('X-Request-Id', traceId);
            return traceId;
          },
          timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
          formatters: {
            level: (label: string) => ({ level: label }),
          },
          // Never let the raw Authorization header reach the logs.
          redact: {
            paths: ['req.headers.authorization'],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class AppLoggerModule {}
