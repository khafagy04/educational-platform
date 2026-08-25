import type { RequestHandler } from 'express';
import type { UserRole } from '../generated/prisma/enums.js';
import { ForbiddenError, UnauthorizedError } from '../errors/application-error.js';

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (request, _response, next) => {
    if (!request.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(request.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
};
