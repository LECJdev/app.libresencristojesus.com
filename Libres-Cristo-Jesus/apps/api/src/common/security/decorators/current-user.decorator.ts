import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { RequestWithUser } from '../guards/jwt-auth.guard';

/**
 * Param decorator that extracts the decoded JWT payload `JwtAuthGuard`
 * attaches to the request (`request.user`). Returns `undefined` on
 * public routes with no token. Usage: `@CurrentUser() user: JwtPayload`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
