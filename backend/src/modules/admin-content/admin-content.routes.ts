import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { AdminContentController } from './admin-content.controller.js';
import { AdminContentRepository } from './admin-content.repository.js';
import { AdminContentService } from './admin-content.service.js';
import {
  contentIdParams,
  faqSchema,
  moderationSchema,
  notificationQuery,
  settingKeyParams,
  settingSchema,
  testimonialQuery,
  testimonialSchema,
  updateFaqSchema,
} from './admin-content.validators.js';

export const createAdminContentRouter = (): Router => {
  const controller = new AdminContentController(
    new AdminContentService(new AdminContentRepository(database)),
  );
  const router = Router();
  const staff = [authenticate, requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN)];
  router.post(
    '/testimonials',
    authenticate,
    requireRole(UserRole.STUDENT),
    validate({ body: testimonialSchema }),
    controller.submitTestimonial,
  );
  router.get('/testimonials', controller.publicTestimonials);
  router.get(
    '/admin/testimonials',
    ...staff,
    validate({ query: testimonialQuery }),
    controller.adminTestimonials,
  );
  router.patch(
    '/admin/testimonials/:id',
    ...staff,
    validate({ params: contentIdParams, body: moderationSchema }),
    controller.moderate,
  );
  router.get('/faqs', controller.publicFaqs);
  router.post('/admin/faqs', ...staff, validate({ body: faqSchema }), controller.createFaq);
  router.patch(
    '/admin/faqs/:id',
    ...staff,
    validate({ params: contentIdParams, body: updateFaqSchema }),
    controller.updateFaq,
  );
  router.delete(
    '/admin/faqs/:id',
    ...staff,
    validate({ params: contentIdParams }),
    controller.deleteFaq,
  );
  router.put(
    '/admin/settings/:key',
    ...staff,
    validate({ params: settingKeyParams, body: settingSchema }),
    controller.setSetting,
  );
  router.get('/settings/public', controller.publicSettings);
  router.get(
    '/me/notifications',
    authenticate,
    validate({ query: notificationQuery }),
    controller.notifications,
  );
  router.post(
    '/me/notifications/:id/read',
    authenticate,
    validate({ params: contentIdParams }),
    controller.readNotification,
  );
  return router;
};
