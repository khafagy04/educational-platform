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
import { AttachmentsController } from './attachments.controller.js';
import { AttachmentsRepository } from './attachments.repository.js';
import { AttachmentsService } from './attachments.service.js';
import {
  attachmentIdParams,
  attachmentMetadataSchema,
  lessonAttachmentsParams,
} from './attachments.validators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

export const createAttachmentsRouter = (
  storage: StorageProvider = createStorageProvider(),
): Router => {
  const controller = new AttachmentsController(
    new AttachmentsService(new AttachmentsRepository(database), storage),
  );
  const router = Router();
  const admin = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  router.get(
    '/lessons/:lessonId/attachments',
    ...admin,
    validate({ params: lessonAttachmentsParams }),
    controller.list,
  );
  router.post(
    '/lessons/:lessonId/attachments',
    ...admin,
    validate({ params: lessonAttachmentsParams }),
    upload.single('file'),
    validate({ body: attachmentMetadataSchema }),
    controller.upload,
  );
  router.delete(
    '/attachments/:id',
    ...admin,
    validate({ params: attachmentIdParams }),
    controller.delete,
  );
  router.get(
    '/attachments/:id/download',
    authenticate,
    validate({ params: attachmentIdParams }),
    controller.download,
  );
  return router;
};
