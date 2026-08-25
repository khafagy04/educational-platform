import { Service } from '../../core/service.js';
import type { DomainEventPublisher } from '../../integrations/events/domain-event.publisher.js';
import type { ProgressRepositoryPort } from './progress.repository.js';
import type { UpdateProgressInput } from './progress.validators.js';

export class ProgressService extends Service<ProgressRepositoryPort> {
  public constructor(
    repository: ProgressRepositoryPort,
    private readonly events: DomainEventPublisher,
  ) {
    super(repository);
  }

  public async update(userId: string, lessonId: string, input: UpdateProgressInput) {
    const result = await this.repository.updateProgress(userId, lessonId, input);
    if (result.completionEvent) {
      await this.events.publish({
        type: 'course.completed',
        idempotencyKey: `course-completed:${result.completionEvent.enrollmentId}`,
        occurredAt: new Date(),
        ...result.completionEvent,
      });
    }
    return result.progress;
  }

  public getCourse(userId: string, courseId: string): Promise<unknown> {
    return this.repository.getCourseProgress(userId, courseId);
  }

  public dashboard(userId: string): Promise<unknown> {
    return this.repository.getDashboard(userId);
  }
}
