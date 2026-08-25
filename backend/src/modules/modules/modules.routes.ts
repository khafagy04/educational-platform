import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { ModulesController } from './modules.controller.js';
import { ModulesRepository } from './modules.repository.js';
import { ModulesService } from './modules.service.js';
import {
  courseModulesParams,
  createModuleSchema,
  moduleIdParams,
  reorderModulesSchema,
  updateModuleSchema,
} from './modules.validators.js';

export const createModulesRouter = (): Router => {
  const controller = new ModulesController(new ModulesService(new ModulesRepository(database)));
  const router = Router();
  const admin = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  router.get(
    '/courses/:courseId/modules',
    ...admin,
    validate({ params: courseModulesParams }),
    controller.list,
  );
  router.post(
    '/courses/:courseId/modules',
    ...admin,
    validate({ params: courseModulesParams, body: createModuleSchema }),
    controller.create,
  );
  router.put(
    '/courses/:courseId/modules/reorder',
    ...admin,
    validate({ params: courseModulesParams, body: reorderModulesSchema }),
    controller.reorder,
  );
  router.patch(
    '/modules/:id',
    ...admin,
    validate({ params: moduleIdParams, body: updateModuleSchema }),
    controller.update,
  );
  router.delete('/modules/:id', ...admin, validate({ params: moduleIdParams }), controller.delete);
  return router;
};
