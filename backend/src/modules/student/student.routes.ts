import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { StudentController } from './student.controller.js';
import { StudentService } from './student.service.js';
import {
  changePasswordSchema,
  courseIdParams,
  notificationPreferencesSchema,
  studentCourseQuery,
  updateProfileSchema,
} from './student.validators.js';

export const createStudentRouter = (): Router => {
  const router = Router();
  const controller = new StudentController(new StudentService(database));
  const student = [authenticate, requireRole(UserRole.STUDENT)];
  router.get(
    '/me/courses',
    ...student,
    validate({ query: studentCourseQuery }),
    controller.courses,
  );
  router.get(
    '/me/courses/:id/player',
    ...student,
    validate({ params: courseIdParams }),
    controller.player,
  );
  router.post(
    '/me/favorites/:id',
    ...student,
    validate({ params: courseIdParams }),
    controller.addFavorite,
  );
  router.delete(
    '/me/favorites/:id',
    ...student,
    validate({ params: courseIdParams }),
    controller.removeFavorite,
  );
  router.get('/me/certificates', ...student, controller.certificates);
  router.get('/me/profile', ...student, controller.profile);
  router.patch(
    '/me/profile',
    ...student,
    validate({ body: updateProfileSchema }),
    controller.updateProfile,
  );
  router.post(
    '/me/password',
    ...student,
    validate({ body: changePasswordSchema }),
    controller.changePassword,
  );
  router.get('/me/notification-preferences', ...student, controller.preferences);
  router.patch(
    '/me/notification-preferences',
    ...student,
    validate({ body: notificationPreferencesSchema }),
    controller.updatePreferences,
  );
  return router;
};
