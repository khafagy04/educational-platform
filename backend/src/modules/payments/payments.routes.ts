import { Router } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';
import {
  createFawaterkProvider,
  type FawaterkProvider,
} from '../../integrations/fawaterk/fawaterk.provider.js';
import { database } from '../../lib/database.js';
import { authenticate } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';
import {
  createOrderSchema,
  fawaterkWebhookSchema,
  orderIdParams,
  payOrderSchema,
  topupSchema,
  transactionListQuery,
} from './payments.validators.js';

export const createPaymentsRouter = (
  provider: FawaterkProvider = createFawaterkProvider(),
): Router => {
  const controller = new PaymentsController(
    new PaymentsService(new PaymentsRepository(database), provider),
  );
  const router = Router();
  const student = [authenticate, requireRole(UserRole.STUDENT)];
  const paymentLimit = rateLimit(30, 15 * 60 * 1000);
  router.get('/wallet', ...student, controller.wallet);
  router.get(
    '/wallet/transactions',
    ...student,
    validate({ query: transactionListQuery }),
    controller.transactions,
  );
  router.post(
    '/wallet/topup',
    ...student,
    paymentLimit,
    validate({ body: topupSchema }),
    controller.topup,
  );
  router.post(
    '/orders',
    ...student,
    paymentLimit,
    validate({ body: createOrderSchema }),
    controller.createOrder,
  );
  router.post(
    '/orders/:id/pay',
    ...student,
    paymentLimit,
    validate({ params: orderIdParams, body: payOrderSchema }),
    controller.payOrder,
  );
  const webhookHandlers = [
    rateLimit(300, 60_000),
    validate({ body: fawaterkWebhookSchema }),
    controller.webhook,
  ];
  router.post('/webhooks/fawaterk', ...webhookHandlers);
  router.post('/webhooks/fawaterk_json', ...webhookHandlers);
  return router;
};
