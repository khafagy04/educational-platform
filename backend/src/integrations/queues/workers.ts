import { Worker } from 'bullmq';
import type { StorageProvider } from '../storage/storage.provider.js';
import type { VideoProvider } from '../video-provider/video.provider.js';
import { createEmailSender } from '../email/email.sender.js';
import type { CourseCompletedEvent } from '../events/domain-event.publisher.js';
import { expireEnrollments } from '../../jobs/enrollment-expiry.job.js';
import { logger } from '../../lib/logger.js';
import { createCertificatesService } from '../../modules/certificates/certificates.routes.js';
import { createPlatformQueues, queueNames, redisConnection } from './queues.js';

type EmailJob = { email: string; token: string };

export const startQueueWorkers = async (storage: StorageProvider, videoProvider: VideoProvider) => {
  void videoProvider;
  const connection = redisConnection();
  const delivery = createEmailSender();
  const certificates = createCertificatesService(storage);
  const workers = [
    new Worker<EmailJob>(
      queueNames.email,
      async (job) => {
        if (job.name === 'verification')
          await delivery.sendVerification(job.data.email, job.data.token);
        else if (job.name === 'password-reset')
          await delivery.sendPasswordReset(job.data.email, job.data.token);
        else throw new Error(`Unknown email job: ${job.name}`);
      },
      { connection },
    ),
    new Worker<CourseCompletedEvent>(
      queueNames.certificates,
      async (job) => certificates.issue(job.data),
      { connection },
    ),
    new Worker(
      queueNames.maintenance,
      async (job) => {
        if (job.name !== 'expire-enrollments')
          throw new Error(`Unknown maintenance job: ${job.name}`);
        return expireEnrollments();
      },
      { connection },
    ),
    new Worker(
      queueNames.video,
      async (job) => {
        if (job.name !== 'poll-processing') throw new Error(`Unknown video job: ${job.name}`);
        logger.info('video processing polling heartbeat completed');
        await Promise.resolve();
      },
      { connection },
    ),
  ];
  for (const worker of workers) {
    worker.on('failed', (job, error) => {
      logger.error(
        {
          queue: worker.name,
          jobId: job?.id,
          attemptsMade: job?.attemptsMade,
          error: error.message,
        },
        'background job attempt failed',
      );
    });
  }
  const queues = createPlatformQueues();
  await queues.maintenance.upsertJobScheduler(
    'daily-enrollment-expiry',
    { pattern: '0 0 2 * * *', tz: 'UTC' },
    { name: 'expire-enrollments', data: {} },
  );
  await queues.video.upsertJobScheduler(
    'video-processing-poll',
    { every: 300_000 },
    { name: 'poll-processing', data: {} },
  );
  return { workers, queues };
};
