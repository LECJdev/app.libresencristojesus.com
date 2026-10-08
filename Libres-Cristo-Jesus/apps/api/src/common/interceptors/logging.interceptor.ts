import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Response } from 'express';
import type { RequestWithUser } from '../security/guards/jwt-auth.guard';

/**
 * Logs method/route/status/duration for every request, via the Pino
 * logger (never `console.log`) — this is the single source of the
 * per-request access log line (`pino-http`'s own `autoLogging` is
 * disabled in `logger.module.ts` to avoid a duplicate line).
 *
 * Also `assign()`s `traceId`/`userId` onto the request's logger context
 * (nestjs-pino's AsyncLocalStorage-backed bindings), so every subsequent
 * log line in this request — including one from `AllExceptionsFilter`,
 * if it errors — carries them automatically, without every call site
 * needing to pass them explicitly. `request.id` (pino-http's `genReqId`
 * result, doc21's `traceId`) is otherwise only available nested under a
 * `req.id` key via pino-http's default request serializer — `assign()`
 * is what hoists it to a clean top-level `traceId` field, matching
 * doc21's exact log shape.
 *
 * `userId` is only known after `JwtAuthGuard` has run (interceptors
 * execute after guards), so it's `null` here for public/unauthenticated
 * routes.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithUser>();
    const response = httpContext.getResponse<Response>();
    const { method, originalUrl } = request;
    const start = Date.now();

    this.logger.assign({ traceId: request.id, userId: request.user?.sub ?? null });

    return next.handle().pipe(
      tap(() => {
        this.logger.info(
          {
            method,
            url: originalUrl,
            statusCode: response.statusCode,
            durationMs: Date.now() - start,
          },
          'Request handled',
        );
      }),
    );
  }
}
