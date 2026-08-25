import { logger } from '../../lib/logger.js';

export type CourseCompletedEvent = {
  type: 'course.completed';
  idempotencyKey: string;
  occurredAt: Date;
  enrollmentId: string;
  userId: string;
  courseId: string;
};

export type DomainEvent = CourseCompletedEvent;

export type DomainEventPublisher = {
  publish(event: DomainEvent): Promise<void>;
};

export class LoggingDomainEventPublisher implements DomainEventPublisher {
  public async publish(event: DomainEvent): Promise<void> {
    logger.info({ eventType: event.type, eventId: event.idempotencyKey }, 'domain event published');
    await Promise.resolve();
  }
}
