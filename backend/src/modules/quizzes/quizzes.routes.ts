import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { QuizzesController } from './quizzes.controller.js';
import { QuizzesRepository } from './quizzes.repository.js';
import { QuizzesService } from './quizzes.service.js';
import {
  attemptIdParams,
  createQuestionSchema,
  createQuizSchema,
  gradeAttemptSchema,
  gradingQueueQuery,
  questionIdParams,
  quizIdParams,
  quizQuestionParams,
  submitAttemptSchema,
  updateQuestionSchema,
  updateQuizSchema,
} from './quizzes.validators.js';

export const createQuizzesRouter = (): Router => {
  const controller = new QuizzesController(new QuizzesService(new QuizzesRepository(database)));
  const router = Router();
  const staff = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  const student = [authenticate, requireRole(UserRole.STUDENT)];

  router.post('/quizzes', ...staff, validate({ body: createQuizSchema }), controller.createQuiz);
  router.get(
    '/quizzes/:id/admin',
    ...staff,
    validate({ params: quizIdParams }),
    controller.getQuizAdmin,
  );
  router.patch(
    '/quizzes/:id',
    ...staff,
    validate({ params: quizIdParams, body: updateQuizSchema }),
    controller.updateQuiz,
  );
  router.delete(
    '/quizzes/:id',
    ...staff,
    validate({ params: quizIdParams }),
    controller.deleteQuiz,
  );
  router.post(
    '/quizzes/:quizId/questions',
    ...staff,
    validate({ params: quizQuestionParams, body: createQuestionSchema }),
    controller.createQuestion,
  );
  router.put(
    '/questions/:id',
    ...staff,
    validate({ params: questionIdParams, body: updateQuestionSchema }),
    controller.updateQuestion,
  );
  router.delete(
    '/questions/:id',
    ...staff,
    validate({ params: questionIdParams }),
    controller.deleteQuestion,
  );
  router.post(
    '/quizzes/:id/attempts',
    ...student,
    validate({ params: quizIdParams }),
    controller.startAttempt,
  );
  router.post(
    '/attempts/:id/submit',
    ...student,
    validate({ params: attemptIdParams, body: submitAttemptSchema }),
    controller.submitAttempt,
  );
  router.get(
    '/attempts/:id',
    ...student,
    validate({ params: attemptIdParams }),
    controller.getAttempt,
  );
  router.get(
    '/admin/attempts',
    ...staff,
    validate({ query: gradingQueueQuery }),
    controller.gradingQueue,
  );
  router.post(
    '/admin/attempts/:id/grade',
    ...staff,
    validate({ params: attemptIdParams, body: gradeAttemptSchema }),
    controller.gradeAttempt,
  );
  return router;
};
