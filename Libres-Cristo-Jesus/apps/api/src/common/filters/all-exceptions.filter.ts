import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import type { ApiErrorDetail, ApiErrorResponse } from '@lcj/types';
import { AppException } from '../exceptions/app.exception';
import type { RequestWithUser } from '../security/guards/jwt-auth.guard';

const DEFAULT_ERROR_MESSAGE = 'Ha ocurrido un error inesperado. Intenta nuevamente más tarde.';
const VALIDATION_ERROR_MESSAGE = 'Validation Error';

/**
 * Single place every exception in the app funnels through. Guarantees:
 * - the client always gets the standard envelope
 *   (`Documentos/19`, section 4): `{ success: false, message, errors }`.
 * - stack traces, SQL, or any other internal detail NEVER reach the
 *   client (doc21) — only the full detail goes to the (Pino/JSON) logs,
 *   tagged with `traceId`/`userId` for correlation.
 *
 * Three cases:
 * 1. `HttpException` whose response body is already an array of
 *    `{field, message}` (the shape our global `ValidationPipe`
 *    `exceptionFactory`, wired via `APP_PIPE` in `CommonModule`,
 *    produces) -> validation envelope with the doc19-literal
 *    `"Validation Error"` message.
 * 2. Any other `HttpException` (404, 401, 403, 409, ...) -> its own
 *    status/message, empty `errors`.
 * 3. `AppException` (future domain exceptions) -> its own
 *    statusCode/message/errors.
 * 4. Anything else (unexpected/unknown) -> generic 500, no leakage.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();

    const { statusCode, body } = this.buildResponseBody(exception);

    // `traceId` is set explicitly here (not only via LoggingInterceptor's
    // `assign()`) because Guards run BEFORE interceptors — a request
    // JwtAuthGuard/RolesGuard rejects never reaches LoggingInterceptor at
    // all, so this filter must not depend on it having run.
    this.logger.error(
      {
        traceId: request.id,
        userId: request.user?.sub ?? null,
        path: request.originalUrl,
        method: request.method,
        statusCode,
        err: exception,
      },
      'Unhandled exception',
    );

    response.status(statusCode).json(body);
  }

  private buildResponseBody(exception: unknown): {
    statusCode: number;
    body: ApiErrorResponse;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();

      if (Array.isArray(payload) && this.isErrorDetailArray(payload)) {
        return {
          statusCode,
          body: { success: false, message: VALIDATION_ERROR_MESSAGE, errors: payload },
        };
      }

      return {
        statusCode,
        body: {
          success: false,
          message: this.extractMessage(payload, exception.message),
          errors: [],
        },
      };
    }

    if (exception instanceof AppException) {
      return {
        statusCode: exception.statusCode,
        body: { success: false, message: exception.message, errors: exception.errors },
      };
    }

    // Unknown/unexpected error: never leak internals to the client.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { success: false, message: DEFAULT_ERROR_MESSAGE, errors: [] },
    };
  }

  private extractMessage(payload: unknown, fallback: string): string {
    if (typeof payload === 'string') {
      return payload;
    }
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof (payload as Record<string, unknown>).message === 'string'
    ) {
      return (payload as Record<string, unknown>).message as string;
    }
    return fallback;
  }

  private isErrorDetailArray(payload: unknown[]): payload is ApiErrorDetail[] {
    return payload.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).field === 'string' &&
        typeof (item as Record<string, unknown>).message === 'string',
    );
  }
}
