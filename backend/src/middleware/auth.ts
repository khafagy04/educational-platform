import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/application-error.js';
import { TokenService } from '../utils/tokens.js';

export const tokenService = new TokenService(
  env.JWT_ACCESS_SECRET,
  env.REFRESH_TOKEN_PEPPER,
  env.ACCESS_TOKEN_TTL_SECONDS,
);

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    next(new UnauthorizedError());
    return;
  }
  try {
    const payload = tokenService.verifyAccessToken(authorization.slice(7));
    request.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
};
