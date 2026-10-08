import type { ApiErrorDetail } from '@lcj/types';

export interface AppExceptionOptions {
  statusCode?: number;
  errorCode?: string;
  errors?: ApiErrorDetail[];
}

/**
 * Generic base exception for future business/domain modules to extend
 * (e.g. a future `DistrictAlreadyExistsException` in a later phase).
 * This phase deliberately defines NO concrete domain exception — only
 * this reusable base, per the brief ("no inventes excepciones de
 * dominio concretas todavía").
 *
 * `AllExceptionsFilter` recognizes `instanceof AppException` and maps it
 * to the standard error envelope using `statusCode`/`message`/`errors`;
 * anything not caught by application code falls through to a generic
 * 500 with no internal details leaked to the client.
 */
export class AppException extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly errors: ApiErrorDetail[];

  constructor(message: string, options: AppExceptionOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.statusCode = options.statusCode ?? 500;
    this.errorCode = options.errorCode ?? 'INTERNAL_ERROR';
    this.errors = options.errors ?? [];
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
