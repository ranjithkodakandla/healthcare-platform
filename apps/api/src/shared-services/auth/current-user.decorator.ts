import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPrincipal } from './auth-provider.interface';

export function extractCurrentUser(ctx: ExecutionContext): AuthenticatedPrincipal {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedPrincipal => extractCurrentUser(ctx),
);
