import { database } from '../lib/database.js';
import { logger } from '../lib/logger.js';
import { PaymentsRepository } from '../modules/payments/payments.repository.js';

const oneDayMs = 86_400_000;

export const expireEnrollments = async (): Promise<number> => {
  const count = await new PaymentsRepository(database).expireEnrollments(new Date());
  if (count > 0) logger.info({ count }, 'expired elapsed enrollments');
  return count;
};

export const startEnrollmentExpiryJob = (): NodeJS.Timeout => {
  void expireEnrollments().catch((error: unknown) => {
    logger.error({ err: error }, 'enrollment expiry job failed');
  });
  const timer = setInterval(() => {
    void expireEnrollments().catch((error: unknown) => {
      logger.error({ err: error }, 'enrollment expiry job failed');
    });
  }, oneDayMs);
  timer.unref();
  return timer;
};
