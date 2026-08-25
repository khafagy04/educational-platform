import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ApplicationError, NotFoundError } from '../errors/application-error.js';
import { reportError } from '../integrations/error-reporting/error-reporter.js';

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new NotFoundError());
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  void _next;
  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error: { code: 'UPLOAD_ERROR', message: 'ملف الرفع غير صالح أو يتجاوز الحجم المسموح' },
    });
    return;
  }
  if (error instanceof ApplicationError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  request.log.error({ err: error }, 'unhandled request error');
  void reportError(error, { requestId: request.id, path: request.path, method: request.method });
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'حدث خطأ غير متوقع',
    },
  });
};
