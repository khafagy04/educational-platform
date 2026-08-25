import { Router } from 'express';
import multer from 'multer';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  createStorageProvider,
  type StorageProvider,
} from '../../integrations/storage/storage.provider.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { CoursesController } from './courses.controller.js';
import { CoursesRepository } from './courses.repository.js';
import { CoursesService } from './courses.service.js';
import {
  courseIdParams,
  courseListQuery,
  courseSlugParams,
  createCourseSchema,
  updateCourseSchema,
} from './courses.validators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export const createCoursesRouter = (storage: StorageProvider = createStorageProvider()): Router => {
  const controller = new CoursesController(
    new CoursesService(new CoursesRepository(database), storage),
  );
  const router = Router();
  const admin = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  router.get('/', validate({ query: courseListQuery }), controller.list);
  router.get('/slug/:slug', validate({ params: courseSlugParams }), controller.getPublished);
  router.get('/:id/admin', ...admin, validate({ params: courseIdParams }), controller.getAdmin);
  router.post('/', ...admin, validate({ body: createCourseSchema }), controller.create);
  router.patch(
    '/:id',
    ...admin,
    validate({ params: courseIdParams, body: updateCourseSchema }),
    controller.update,
  );
  router.post(
    '/:id/thumbnail',
    ...admin,
    validate({ params: courseIdParams }),
    upload.single('file'),
    controller.thumbnail,
  );
  router.delete('/:id', ...admin, validate({ params: courseIdParams }), controller.delete);
  return router;
};
