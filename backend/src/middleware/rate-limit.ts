import type { RequestHandler } from 'express';
import { ApplicationError } from '../errors/application-error.js';

type Bucket = { count: number; resetsAt: number };

export const rateLimit = (limit: number, windowMs: number): RequestHandler => {
  const buckets = new Map<string, Bucket>();
  return (request, _response, next) => {
    const now = Date.now();
    const key = request.ip ?? 'unknown';
    const current = buckets.get(key);
    if (!current || current.resetsAt <= now) {
      buckets.set(key, { count: 1, resetsAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > limit) {
      next(new ApplicationError(429, 'RATE_LIMITED', 'محاولات كثيرة، حاول مرة أخرى لاحقاً'));
      return;
    }
    next();
  };
};
