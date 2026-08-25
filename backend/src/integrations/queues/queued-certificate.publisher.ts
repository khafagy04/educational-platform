import type { DomainEvent, DomainEventPublisher } from '../events/domain-event.publisher.js';
import { createPlatformQueues } from './queues.js';

export class QueuedCertificatePublisher implements DomainEventPublisher {
  private readonly queue = createPlatformQueues().certificates;
  public async publish(event: DomainEvent): Promise<void> {
    await this.queue.add('issue', event, { jobId: event.idempotencyKey.replaceAll(':', '-') });
  }
}
