import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse, PaginationMeta } from '@lcj/types';

const DEFAULT_SUCCESS_MESSAGE = 'Operación realizada correctamente.';

/**
 * A controller may return either its raw data directly, or an object
 * shaped `{ data, message?, meta? }` when it needs to set a custom
 * message or pagination `meta` (doc19 section 6). Anything else is
 * treated as the raw `data` payload.
 */
interface RawControllerResult<T> {
  data: T;
  message?: string;
  meta?: PaginationMeta | Record<string, unknown>;
}

function isRawControllerResult<T>(value: unknown): value is RawControllerResult<T> {
  return typeof value === 'object' && value !== null && 'data' in value && !('success' in value);
}

/**
 * Wraps every successful controller response in the standard envelope
 * (`Documentos/19`, section 4): `{ success: true, message, data, meta }`.
 * Errors never reach this interceptor — they're handled exclusively by
 * `AllExceptionsFilter`, which produces the matching error envelope.
 *
 * ── The one exception: binary downloads ──────────────────────────────
 * A `StreamableFile` passes through UNTOUCHED. Wrapping one produces a
 * response that still has the right `Content-Type`, the right
 * `Content-Disposition` and even a plausible byte count — and is a JSON
 * document beginning `{"success":true,…}` with a spreadsheet's name. Excel
 * simply refuses to open it, and nothing upstream reports a failure.
 *
 * Handled HERE rather than with a per-route decorator on purpose: an opt-out
 * someone has to remember is an opt-out someone will forget, and the symptom
 * only surfaces when a user double-clicks the download. A `StreamableFile`
 * is by definition not JSON, so the rule needs no annotation to be correct.
 */
@Injectable()
export class ResponseWrapperInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T> | StreamableFile
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | StreamableFile> {
    return next.handle().pipe(
      map((result) => {
        if (result instanceof StreamableFile) {
          return result;
        }

        if (isRawControllerResult<T>(result)) {
          return {
            success: true as const,
            message: result.message ?? DEFAULT_SUCCESS_MESSAGE,
            data: result.data,
            meta: result.meta,
          };
        }

        return {
          success: true as const,
          message: DEFAULT_SUCCESS_MESSAGE,
          data: result,
        };
      }),
    );
  }
}
