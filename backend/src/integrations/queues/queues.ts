import { Queue, type ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';

export const queueNames = {
  email: 'platform-email',
  certificates: 'platform-certificates',
  maintenance: 'platform-maintenance',
  video: 'platform-video',
} as const;
export const redisConnection = (): ConnectionOptions => {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.pathname.length > 1 ? { db: Number(url.pathname.slice(1)) } : {}),
  };
};
const defaultJobOptions = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: 1000,
  removeOnFail: 1000,
};
export const createPlatformQueues = () => {
  const connection = redisConnection();
  return {
    email: new Queue(queueNames.email, { connection, defaultJobOptions }),
    certificates: new Queue(queueNames.certificates, { connection, defaultJobOptions }),
    maintenance: new Queue(queueNames.maintenance, { connection, defaultJobOptions }),
    video: new Queue(queueNames.video, { connection, defaultJobOptions }),
  };
};
