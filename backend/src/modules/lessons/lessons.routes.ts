import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  createStorageProvider,
  type StorageProvider,
} from '../../integrations/storage/storage.provider.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { LessonsController } from './lessons.controller.js';
import { LessonsRepository } from './lessons.repository.js';
import { LessonsService } from './lessons.service.js';
import {
  createLessonSchema,
  lessonIdParams,
  moduleLessonsParams,
  reorderLessonsSchema,
  updateLessonSchema,
} from './lessons.validators.js';

export const createLessonsRouter = (storage: StorageProvider = createStorageProvider()): Router => {
  const controller = new LessonsController(
    new LessonsService(new LessonsRepository(database), storage),
  );
  const router = Router();
  const admin = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  router.get(
    '/modules/:moduleId/lessons',
    ...admin,
    validate({ params: moduleLessonsParams }),
    controller.list,
  );
  router.post(
    '/modules/:moduleId/lessons',
    ...admin,
    validate({ params: moduleLessonsParams, body: createLessonSchema }),
    controller.create,
  );
  router.put(
    '/modules/:moduleId/lessons/reorder',
    ...admin,
    validate({ params: moduleLessonsParams, body: reorderLessonsSchema }),
    controller.reorder,
  );
  router.patch(
    '/lessons/:id',
    ...admin,
    validate({ params: lessonIdParams, body: updateLessonSchema }),
    controller.update,
  );
  router.delete('/lessons/:id', ...admin, validate({ params: lessonIdParams }), controller.delete);
  return router;
};
