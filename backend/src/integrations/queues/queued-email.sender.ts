import { randomUUID } from 'node:crypto';
import type { EmailSender } from '../email/email.sender.js';
import { createPlatformQueues } from './queues.js';

export class QueuedEmailSender implements EmailSender {
  private readonly queue = createPlatformQueues().email;
  public async sendVerification(email: string, token: string): Promise<void> {
    await this.queue.add('verification', { email, token }, { jobId: `verify-${randomUUID()}` });
  }
  public async sendPasswordReset(email: string, token: string): Promise<void> {
    await this.queue.add('password-reset', { email, token }, { jobId: `reset-${randomUUID()}` });
  }
}
