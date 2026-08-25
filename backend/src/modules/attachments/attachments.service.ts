import { randomUUID } from 'node:crypto';
import { Service } from '../../core/service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors/application-error.js';
import type { StorageProvider } from '../../integrations/storage/storage.provider.js';
import type { AttachmentsRepositoryPort } from './attachments.repository.js';
import type { AttachmentMetadataInput } from './attachments.validators.js';

const allowedTypes: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class AttachmentsService extends Service<AttachmentsRepositoryPort> {
  public constructor(
    repository: AttachmentsRepositoryPort,
    private readonly storage: StorageProvider,
  ) {
    super(repository);
  }
  public async list(lessonId: string) {
    await this.assertLesson(lessonId);
    return this.repository.list(lessonId);
  }
  public async upload(
    lessonId: string,
    metadata: AttachmentMetadataInput,
    file: Express.Multer.File,
  ) {
    await this.assertLesson(lessonId);
    const extension = allowedTypes[file.mimetype];
    if (!extension) throw new ValidationError('صيغة المرفق غير مسموح بها');
    const key = `lessons/${lessonId}/attachments/${randomUUID()}.${extension}`;
    await this.storage.upload({ key, body: file.buffer, mimeType: file.mimetype });
    try {
      return await this.repository.create(lessonId, {
        ...metadata,
        fileKey: key,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
      });
    } catch (error) {
      await this.storage.delete(key);
      throw error;
    }
  }
  public async delete(id: string): Promise<void> {
    const attachment = await this.repository.findById(id);
    if (!attachment) throw new NotFoundError('المرفق غير موجود');
    await this.repository.delete(id);
    await this.storage.delete(attachment.fileKey);
  }
  public async download(id: string, userId: string) {
    const attachment = await this.repository.findDownloadContext(id, userId);
    if (!attachment) throw new ForbiddenError('لا تملك صلاحية تنزيل هذا المرفق');
    return {
      url: await this.storage.createSignedDownloadUrl(attachment.fileKey, 300),
      expiresInSeconds: 300,
      title: attachment.title,
    };
  }
  private async assertLesson(id: string): Promise<void> {
    if (!(await this.repository.lessonExists(id))) throw new NotFoundError('الدرس غير موجود');
  }
}
