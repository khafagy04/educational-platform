import type {
  DomainEvent,
  DomainEventPublisher,
} from '../../integrations/events/domain-event.publisher.js';
import { logger } from '../../lib/logger.js';
import type { CertificatesService } from './certificates.service.js';

export class CertificateEventPublisher implements DomainEventPublisher {
  public constructor(private readonly certificates: CertificatesService) {}
  public async publish(event: DomainEvent): Promise<void> {
    await this.certificates.issue(event);
    logger.info({ eventType: event.type, eventId: event.idempotencyKey }, 'domain event handled');
  }
}
