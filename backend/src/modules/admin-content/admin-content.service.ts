import { Service } from '../../core/service.js';
import type { AdminContentRepositoryPort } from './admin-content.repository.js';
import type {
  FaqInput,
  ModerationInput,
  NotificationQuery,
  SettingInput,
  TestimonialInput,
  TestimonialQuery,
  UpdateFaqInput,
} from './admin-content.validators.js';

export class AdminContentService extends Service<AdminContentRepositoryPort> {
  public constructor(repository: AdminContentRepositoryPort) {
    super(repository);
  }
  public submitTestimonial(userId: string, input: TestimonialInput) {
    return this.repository.submitTestimonial(userId, input);
  }
  public publicTestimonials() {
    return this.repository.publicTestimonials();
  }
  public adminTestimonials(input: TestimonialQuery) {
    return this.repository.adminTestimonials(input);
  }
  public moderate(actorId: string, id: string, input: ModerationInput) {
    return this.repository.moderate(actorId, id, input);
  }
  public createFaq(input: FaqInput) {
    return this.repository.createFaq(input);
  }
  public updateFaq(id: string, input: UpdateFaqInput) {
    return this.repository.updateFaq(id, input);
  }
  public deleteFaq(id: string) {
    return this.repository.deleteFaq(id);
  }
  public publicFaqs() {
    return this.repository.publicFaqs();
  }
  public setSetting(actorId: string, key: string, input: SettingInput) {
    return this.repository.setSetting(actorId, key, input);
  }
  public publicSettings() {
    return this.repository.publicSettings();
  }
  public notifications(userId: string, input: NotificationQuery) {
    return this.repository.notifications(userId, input);
  }
  public readNotification(userId: string, id: string) {
    return this.repository.readNotification(userId, id);
  }
}
