import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  LoggingDomainEventPublisher,
  type DomainEventPublisher,
} from '../../integrations/events/domain-event.publisher.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { ProgressController } from './progress.controller.js';
import { ProgressRepository } from './progress.repository.js';
import { ProgressService } from './progress.service.js';
import {
  progressCourseParams,
  progressLessonParams,
  updateProgressSchema,
} from './progress.validators.js';

export const createProgressRouter = (
  events: DomainEventPublisher = new LoggingDomainEventPublisher(),
): Router => {
  const controller = new ProgressController(
    new ProgressService(new ProgressRepository(database), events),
  );
  const router = Router();
  const student = [authenticate, requireRole(UserRole.STUDENT)];
  router.post(
    '/lessons/:id/progress',
    ...student,
    validate({ params: progressLessonParams, body: updateProgressSchema }),
    controller.update,
  );
  router.get(
    '/courses/:id/progress',
    ...student,
    validate({ params: progressCourseParams }),
    controller.course,
  );
  router.get('/dashboard/student/home', ...student, controller.dashboard);
  return router;
};
