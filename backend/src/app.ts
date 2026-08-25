import cors from 'cors';
import express from 'express';
import { allowedOrigins, env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { HealthRepositoryPort } from './modules/health/health.repository.js';
import { createAuthRouter, type AuthRouterDependencies } from './modules/auth/auth.routes.js';
import {
  createStorageProvider,
  type StorageProvider,
} from './integrations/storage/storage.provider.js';
import { createAttachmentsRouter } from './modules/attachments/attachments.routes.js';
import { createCoursesRouter } from './modules/courses/courses.routes.js';
import { createGradesRouter } from './modules/grades/grades.routes.js';
import { createLessonsRouter } from './modules/lessons/lessons.routes.js';
import { createModulesRouter } from './modules/modules/modules.routes.js';
import { createSubjectsRouter } from './modules/subjects/subjects.routes.js';
import type { VideoProvider } from './integrations/video-provider/video.provider.js';
import { createVideosRouter } from './modules/videos/videos.routes.js';
import type { FawaterkProvider } from './integrations/fawaterk/fawaterk.provider.js';
import { createPaymentsRouter } from './modules/payments/payments.routes.js';
import type { DomainEventPublisher } from './integrations/events/domain-event.publisher.js';
import { createProgressRouter } from './modules/progress/progress.routes.js';
import { createQuizzesRouter } from './modules/quizzes/quizzes.routes.js';
import {
  createCertificatesRouter,
  createCertificatesService,
} from './modules/certificates/certificates.routes.js';
import { CertificateEventPublisher } from './modules/certificates/certificate-event.publisher.js';
import { createAdminContentRouter } from './modules/admin-content/admin-content.routes.js';
import { QueuedCertificatePublisher } from './integrations/queues/queued-certificate.publisher.js';
import { createStudentRouter } from './modules/student/student.routes.js';
import { createAdminRouter } from './modules/admin/admin.routes.js';
import { createAnalyticsRouter } from './modules/analytics/analytics.routes.js';
import { cacheResponse, invalidatePublicCache } from './middleware/response-cache.js';
import { auditSensitiveActions, securityHeaders } from './middleware/security.js';
import { createObservabilityRouter } from './modules/observability/observability.routes.js';

export type AppDependencies = {
  healthRepository?: HealthRepositoryPort;
  auth?: AuthRouterDependencies;
  storage?: StorageProvider;
  videoProvider?: VideoProvider;
  fawaterkProvider?: FawaterkProvider;
  domainEvents?: DomainEventPublisher;
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = express();
  const storage = dependencies.storage ?? createStorageProvider();
  const domainEvents =
    dependencies.domainEvents ??
    (env.JOB_QUEUE_ENABLED
      ? new QueuedCertificatePublisher()
      : new CertificateEventPublisher(createCertificatesService(storage)));

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('json replacer', (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
  app.use((request, _response, next) => {
    request.validated = {};
    next();
  });
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/v1/courses', cacheResponse('courses', 120));
  app.get('/api/v1/courses/slug/:slug', cacheResponse('courses', 120));
  app.get('/api/v1/faqs', cacheResponse('faqs', 300));
  app.get('/api/v1/settings/public', cacheResponse('settings', 300));
  app.use('/api/v1', invalidatePublicCache);
  app.use('/api/v1', auditSensitiveActions);

  app.get('/api/v1', (_request, response) => {
    response.json({ data: { message: 'مرحباً بك في منصة التعلّم' } });
  });
  app.use('/api/v1/health', createHealthRouter(dependencies.healthRepository));
  app.use('/api/v1/auth', createAuthRouter(dependencies.auth));
  app.use('/api/v1/grades', createGradesRouter());
  app.use('/api/v1/subjects', createSubjectsRouter());
  app.use('/api/v1/courses', createCoursesRouter(storage));
  app.use('/api/v1', createModulesRouter());
  app.use('/api/v1', createLessonsRouter(storage));
  app.use('/api/v1', createAttachmentsRouter(storage));
  app.use('/api/v1', createVideosRouter(dependencies.videoProvider));
  app.use('/api/v1', createPaymentsRouter(dependencies.fawaterkProvider));
  app.use('/api/v1', createProgressRouter(domainEvents));
  app.use('/api/v1', createQuizzesRouter());
  app.use('/api/v1', createCertificatesRouter(storage));
  app.use('/api/v1', createAdminContentRouter());
  app.use('/api/v1', createStudentRouter());
  app.use('/api/v1', createAdminRouter());
  app.use('/api/v1', createAnalyticsRouter());
  app.use('/api/v1', createObservabilityRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
