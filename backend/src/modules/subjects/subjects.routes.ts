import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { SubjectsController } from './subjects.controller.js';
import { SubjectsRepository } from './subjects.repository.js';
import { SubjectsService } from './subjects.service.js';
import {
  createSubjectSchema,
  subjectIdParams,
  subjectListQuery,
  updateSubjectSchema,
} from './subjects.validators.js';

export const createSubjectsRouter = (): Router => {
  const controller = new SubjectsController(new SubjectsService(new SubjectsRepository(database)));
  const router = Router();
  const admin = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  router.get('/', validate({ query: subjectListQuery }), controller.list);
  router.get('/:id', validate({ params: subjectIdParams }), controller.get);
  router.post('/', ...admin, validate({ body: createSubjectSchema }), controller.create);
  router.patch(
    '/:id',
    ...admin,
    validate({ params: subjectIdParams, body: updateSubjectSchema }),
    controller.update,
  );
  router.delete('/:id', ...admin, validate({ params: subjectIdParams }), controller.delete);
  return router;
};
