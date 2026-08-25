import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger.js';

export const requestLogger: RequestHandler = pinoHttp({
  logger,
  genReqId: (request, response) => {
    const incomingId = request.headers['x-request-id'];
    const requestId = typeof incomingId === 'string' ? incomingId : randomUUID();
    response.setHeader('x-request-id', requestId);
    return requestId;
  },
  customProps: (request) => ({
    ...(request.user ? { userId: request.user.id } : {}),
  }),
  customSuccessMessage: (request, response) =>
    `${request.method} ${request.url} completed with ${String(response.statusCode)}`,
  customErrorMessage: (request, response) =>
    `${request.method} ${request.url} failed with ${String(response.statusCode)}`,
});
