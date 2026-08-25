import { Repository } from '../../core/repository.js';
import { ConflictError } from '../../errors/application-error.js';
import { Prisma, type Attachment, type PrismaClient } from '../../generated/prisma/client.js';
import { EnrollmentStatus } from '../../generated/prisma/enums.js';
import type { AttachmentMetadataInput } from './attachments.validators.js';

export type AttachmentsRepositoryPort = {
  lessonExists(id: string): Promise<boolean>;
  list(lessonId: string): Promise<Attachment[]>;
  findById(id: string): Promise<Attachment | null>;
  findDownloadContext(id: string, userId: string): Promise<Attachment | null>;
  create(
    lessonId: string,
    input: AttachmentMetadataInput & { fileKey: string; mimeType: string; sizeBytes: bigint },
  ): Promise<Attachment>;
  delete(id: string): Promise<void>;
};

export class AttachmentsRepository
  extends Repository<PrismaClient>
  implements AttachmentsRepositoryPort
{
  public constructor(client: PrismaClient) {
    super(client);
  }
  public async lessonExists(id: string): Promise<boolean> {
    return (await this.client.lesson.count({ where: { id } })) === 1;
  }
  public list(lessonId: string): Promise<Attachment[]> {
    return this.client.attachment.findMany({ where: { lessonId }, orderBy: { sortOrder: 'asc' } });
  }
  public findById(id: string): Promise<Attachment | null> {
    return this.client.attachment.findUnique({ where: { id } });
  }
  public findDownloadContext(id: string, userId: string): Promise<Attachment | null> {
    return this.client.attachment.findFirst({
      where: {
        id,
        lesson: {
          module: {
            course: {
              enrollments: {
                some: {
                  userId,
                  status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
                  startsAt: { lte: new Date() },
                  expiresAt: { gt: new Date() },
                },
              },
            },
          },
        },
      },
    });
  }
  public async create(
    lessonId: string,
    input: AttachmentMetadataInput & { fileKey: string; mimeType: string; sizeBytes: bigint },
  ): Promise<Attachment> {
    try {
      return await this.client.attachment.create({ data: { lessonId, ...input } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('ترتيب المرفق مستخدم بالفعل داخل الدرس');
      }
      throw error;
    }
  }
  public async delete(id: string): Promise<void> {
    await this.client.attachment.delete({ where: { id } });
  }
}
