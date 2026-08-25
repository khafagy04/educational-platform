import { Queue, QueueEvents, Worker } from 'bullmq';
import { afterAll, describe, expect, it } from 'vitest';
import { createStorageProvider } from '../storage/storage.provider.js';
import { createVideoProvider } from '../video-provider/video.provider.js';
import { startQueueWorkers } from './workers.js';
import { redisConnection } from './queues.js';

const runQueueTests = process.env.RUN_QUEUE_TESTS === 'true';
const queueName = `phase-12-retry-${process.pid.toString()}`;
const connection = redisConnection();
const queue = new Queue(queueName, { connection });
const events = new QueueEvents(queueName, { connection });

describe.skipIf(!runQueueTests)('Phase 12 BullMQ jobs', () => {
  afterAll(async () => {
    await queue.obliterate({ force: true });
    await Promise.all([queue.close(), events.close()]);
  });

  it('enqueues without waiting for slow work and retries transient failures', async () => {
    let executions = 0;
    const worker = new Worker(
      queueName,
      async () => {
        executions += 1;
        if (executions < 3) throw new Error('transient provider failure');
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        return 'delivered';
      },
      { connection },
    );
    const started = performance.now();
    const job = await queue.add(
      'slow-email',
      {},
      { attempts: 3, backoff: { type: 'fixed', delay: 20 } },
    );
    expect(performance.now() - started).toBeLessThan(250);
    await expect(job.waitUntilFinished(events, 5000)).resolves.toBe('delivered');
    expect(executions).toBe(3);
    await worker.close();
  });

  it('installs idempotent enrollment and video job schedulers', async () => {
    const runtime = await startQueueWorkers(createStorageProvider(), createVideoProvider());
    const [maintenance, video] = await Promise.all([
      runtime.queues.maintenance.getJobSchedulers(),
      runtime.queues.video.getJobSchedulers(),
    ]);
    expect(maintenance.some(({ key }) => key === 'daily-enrollment-expiry')).toBe(true);
    expect(video.some(({ key }) => key === 'video-processing-poll')).toBe(true);
    await Promise.all(runtime.workers.map((worker) => worker.close()));
    await Promise.all(Object.values(runtime.queues).map((item) => item.close()));
  });
});
