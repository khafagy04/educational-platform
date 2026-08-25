import type { RequestHandler } from 'express';
import { allowedOrigins } from '../config/env.js';
import { ForbiddenError } from '../errors/application-error.js';

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    next(new ForbiddenError('مصدر الطلب غير مسموح به'));
    return;
  }
  next();
};
