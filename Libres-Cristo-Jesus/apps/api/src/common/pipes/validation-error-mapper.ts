import type { ValidationError } from 'class-validator';
import type { ApiErrorDetail } from '@lcj/types';

/** Flattens class-validator's `ValidationError[]` into doc19's `{field, message}[]`. */
export function toApiErrorDetails(validationErrors: ValidationError[]): ApiErrorDetail[] {
  return validationErrors.flatMap((error) => {
    const constraints = error.constraints ?? { invalid: 'Invalid value' };
    return Object.values(constraints).map((message) => ({ field: error.property, message }));
  });
}
