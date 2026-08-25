import { Router } from 'express';
import { z } from 'zod';
import type { StorageProvider } from '../../integrations/storage/storage.provider.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { CertificatesController } from './certificates.controller.js';
import { CertificatesRepository } from './certificates.repository.js';
import { CertificatesService } from './certificates.service.js';

const certificateNumberParams = z.object({
  certificateNumber: z.string().regex(/^EDU-\d{4}-[A-F0-9]{8}$/u),
});
const certificateIdParams = z.object({ id: z.uuid() });
const privateTokenParams = z.object({ token: z.string().min(20).max(2000) });

export const createCertificatesService = (storage: StorageProvider) =>
  new CertificatesService(new CertificatesRepository(database), storage);
export const createCertificatesRouter = (storage: StorageProvider): Router => {
  const controller = new CertificatesController(createCertificatesService(storage));
  const router = Router();
  router.get(
    '/certificates/:certificateNumber',
    validate({ params: certificateNumberParams }),
    controller.verify,
  );
  router.get(
    '/me/certificates/:id/download',
    authenticate,
    validate({ params: certificateIdParams }),
    controller.download,
  );
  router.get(
    '/private-storage/:token',
    validate({ params: privateTokenParams }),
    controller.privateFile,
  );
  return router;
};
