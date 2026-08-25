import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ValidationError } from '../errors/application-error.js';

export type RequestSchemas = {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

export const validate = (schemas: RequestSchemas): RequestHandler => {
  return (request, _response, next) => {
    const entries = Object.entries(schemas) as [keyof RequestSchemas, z.ZodType | undefined][];

    for (const [location, schema] of entries) {
      if (!schema) continue;

      const result = schema.safeParse(request[location]);
      if (!result.success) {
        next(
          new ValidationError(
            undefined,
            result.error.issues.map((issue) => ({
              path: [location, ...issue.path].join('.'),
              code: issue.code,
              message: issue.message,
            })),
          ),
        );
        return;
      }

      request.validated[location] = result.data;
    }

    next();
  };
};
