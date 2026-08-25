import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { GradesController } from './grades.controller.js';
import { GradesRepository } from './grades.repository.js';
import { GradesService } from './grades.service.js';
import { createGradeSchema, gradeIdParams, updateGradeSchema } from './grades.validators.js';

export const createGradesRouter = (): Router => {
  const controller = new GradesController(new GradesService(new GradesRepository(database)));
  const router = Router();
  const admin = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];

  router.get('/', controller.list);
  router.get('/:id', validate({ params: gradeIdParams }), controller.get);
  router.post('/', ...admin, validate({ body: createGradeSchema }), controller.create);
  router.patch(
    '/:id',
    ...admin,
    validate({ params: gradeIdParams, body: updateGradeSchema }),
    controller.update,
  );
  router.delete('/:id', ...admin, validate({ params: gradeIdParams }), controller.delete);
  return router;
};
