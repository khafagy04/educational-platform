import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startEnrollmentExpiryJob } from './jobs/enrollment-expiry.job.js';
import { createStorageProvider } from './integrations/storage/storage.provider.js';
import { createVideoProvider } from './integrations/video-provider/video.provider.js';
import { startQueueWorkers } from './integrations/queues/workers.js';
import { reportError } from './integrations/error-reporting/error-reporter.js';

process.on('uncaughtException', (error) => {
  void reportError(error, { source: 'uncaughtException' }).finally(() => process.exit(1));
});
process.on('unhandledRejection', (error) => {
  void reportError(error, { source: 'unhandledRejection' }).finally(() => process.exit(1));
});

const storage = createStorageProvider();
const videoProvider = createVideoProvider();
const app = createApp({ storage, videoProvider });
if (env.JOB_QUEUE_ENABLED) await startQueueWorkers(storage, videoProvider);
else startEnrollmentExpiryJob();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API listening');
});
