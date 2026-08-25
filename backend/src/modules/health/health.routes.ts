import { Router } from 'express';
import { z } from 'zod';
import { database } from '../../lib/database.js';
import { validate } from '../../middleware/validate.js';
import { HealthController } from './health.controller.js';
import { HealthRepository, type HealthRepositoryPort } from './health.repository.js';
import { HealthService } from './health.service.js';

const componentParams = z.object({ component: z.literal('database') });
const componentQuery = z.object({
  verbose: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const createHealthRouter = (
  repository: HealthRepositoryPort = new HealthRepository(database),
): Router => {
  const healthService = new HealthService(repository);
  const healthController = new HealthController(healthService);
  const router = Router();

  router.get('/live', healthController.liveness);
  router.get('/ready', healthController.readiness);
  router.get(
    '/components/:component',
    validate({ params: componentParams, query: componentQuery }),
    healthController.component,
  );

  return router;
};
