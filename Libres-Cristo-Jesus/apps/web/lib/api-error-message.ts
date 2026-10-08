import { ApiError } from './http-client';

/**
 * Turns any thrown value into something safe to show a user.
 *
 * The backend already writes its messages in Spanish and for humans
 * (`AllExceptionsFilter`), so an `ApiError` is passed through — replacing
 * "Ya existe una Casa de Paz con este código" with a generic sentence
 * would throw away the only part of the response that tells the user what
 * to do next.
 *
 * Anything else (a network failure, a parse error, a bug) becomes the
 * caller's fallback: those carry stack traces and internal detail that
 * belong in a console, never in the UI.
 */
export function resolveApiErrorMessage(error: unknown, fallback: string): string | null {
  if (error === null || error === undefined) {
    return null;
  }
  return error instanceof ApiError ? error.message : fallback;
}
