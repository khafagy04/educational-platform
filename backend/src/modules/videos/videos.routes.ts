import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  createVideoProvider,
  type VideoProvider,
} from '../../integrations/video-provider/video.provider.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { VideosController } from './videos.controller.js';
import { VideosRepository } from './videos.repository.js';
import { VideosService } from './videos.service.js';
import { createVideoUploadSchema, videoLessonParams } from './videos.validators.js';

export const createVideosRouter = (provider: VideoProvider = createVideoProvider()): Router => {
  const controller = new VideosController(
    new VideosService(new VideosRepository(database), provider),
  );
  const router = Router();
  const admin = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  router.post(
    '/lessons/:id/video',
    ...admin,
    validate({ params: videoLessonParams, body: createVideoUploadSchema }),
    controller.createUpload,
  );
  router.delete(
    '/lessons/:id/video',
    ...admin,
    validate({ params: videoLessonParams }),
    controller.delete,
  );
  router.get(
    '/lessons/:id/video-token',
    authenticate,
    rateLimit(30, 60_000),
    validate({ params: videoLessonParams }),
    controller.playback,
  );
  return router;
};
