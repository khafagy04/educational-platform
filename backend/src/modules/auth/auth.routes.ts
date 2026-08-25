import { Router } from 'express';
import { env } from '../../config/env.js';
import { database } from '../../lib/database.js';
import { authenticate, tokenService } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { requireRole } from '../../middleware/rbac.js';
import { requireTrustedOrigin } from '../../middleware/trusted-origin.js';
import { validate } from '../../middleware/validate.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { createEmailSender, type EmailSender } from '../../integrations/email/email.sender.js';
import { QueuedEmailSender } from '../../integrations/queues/queued-email.sender.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository, type AuthRepositoryPort } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from './auth.validators.js';

export type AuthRouterDependencies = {
  repository?: AuthRepositoryPort;
  emailSender?: EmailSender;
};

export const createAuthRouter = (dependencies: AuthRouterDependencies = {}): Router => {
  const repository = dependencies.repository ?? new AuthRepository(database);
  const emailSender =
    dependencies.emailSender ??
    (env.JOB_QUEUE_ENABLED ? new QueuedEmailSender() : createEmailSender());
  const service = new AuthService(
    repository,
    emailSender,
    tokenService,
    env.REFRESH_TOKEN_TTL_DAYS,
  );
  const controller = new AuthController(service);
  const router = Router();
  const authLimit = rateLimit(20, 15 * 60 * 1000);

  router.post('/register', authLimit, validate({ body: registerSchema }), controller.register);
  router.post('/login', authLimit, validate({ body: loginSchema }), controller.login);
  router.post('/refresh', requireTrustedOrigin, authLimit, controller.refresh);
  router.post('/logout', requireTrustedOrigin, controller.logout);
  router.post('/verify-email', authLimit, validate({ body: tokenSchema }), controller.verifyEmail);
  router.post(
    '/forgot-password',
    authLimit,
    validate({ body: forgotPasswordSchema }),
    controller.forgotPassword,
  );
  router.post(
    '/reset-password',
    authLimit,
    validate({ body: resetPasswordSchema }),
    controller.resetPassword,
  );
  router.get('/me', authenticate, controller.me);
  router.get(
    '/role-check',
    authenticate,
    requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN),
    controller.roleCheck,
  );

  return router;
};
