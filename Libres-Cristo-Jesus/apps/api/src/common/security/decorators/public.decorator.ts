import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or an entire controller) as not requiring
 * authentication. `JwtAuthGuard` checks for this metadata first and
 * skips token validation entirely when present — used today for the
 * health-check endpoint, and later for the login endpoint itself
 * (nothing can require a token before a token exists to give out).
 */
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);
