import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { reportError } from '../../integrations/error-reporting/error-reporter.js';
const clientError = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  path: z.string().max(2000).optional(),
});
export const createObservabilityRouter = () => {
  const r = Router();
  r.post('/client-errors', rateLimit(30, 60000), validate({ body: clientError }), async (q, s) => {
    await reportError(new Error((q.validated.body as { message: string }).message), {
      source: 'frontend',
      ...(q.validated.body as object),
    });
    s.status(202).json({ data: { accepted: true } });
  });
  return r;
};
