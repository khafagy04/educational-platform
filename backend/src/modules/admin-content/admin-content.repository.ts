import { Repository } from '../../core/repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/application-error.js';
import { EnrollmentStatus, TestimonialStatus } from '../../generated/prisma/enums.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  FaqInput,
  ModerationInput,
  NotificationQuery,
  SettingInput,
  TestimonialInput,
  TestimonialQuery,
  UpdateFaqInput,
} from './admin-content.validators.js';

export type AdminContentRepositoryPort = {
  submitTestimonial(userId: string, input: TestimonialInput): Promise<unknown>;
  publicTestimonials(): Promise<unknown>;
  adminTestimonials(input: TestimonialQuery): Promise<unknown>;
  moderate(actorId: string, id: string, input: ModerationInput): Promise<unknown>;
  createFaq(input: FaqInput): Promise<unknown>;
  updateFaq(id: string, input: UpdateFaqInput): Promise<unknown>;
  deleteFaq(id: string): Promise<void>;
  publicFaqs(): Promise<unknown>;
  setSetting(actorId: string, key: string, input: SettingInput): Promise<unknown>;
  publicSettings(): Promise<unknown>;
  notifications(userId: string, input: NotificationQuery): Promise<unknown>;
  readNotification(userId: string, id: string): Promise<unknown>;
};

const publicSettingKeys = [
  'homepage.satisfactionPct',
  'homepage.yearsExperience',
  'homepage.courseCount',
  'homepage.studentCount',
  'theme.primaryColor',
];

export class AdminContentRepository
  extends Repository<PrismaClient>
  implements AdminContentRepositoryPort
{
  public constructor(client: PrismaClient) {
    super(client);
  }
  public async submitTestimonial(userId: string, input: TestimonialInput): Promise<unknown> {
    const completed = await this.client.enrollment.count({
      where: { userId, courseId: input.courseId, status: EnrollmentStatus.COMPLETED },
    });
    if (completed === 0) throw new ForbiddenError('يمكن تقييم المساق بعد إكماله فقط');
    try {
      return await this.client.testimonial.create({ data: { userId, ...input } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictError('سبق أن أرسلت تقييماً لهذا المساق');
      throw error;
    }
  }
  public publicTestimonials(): Promise<unknown> {
    return this.client.testimonial.findMany({
      where: { status: TestimonialStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true } },
        course: { select: { title: true, slug: true } },
      },
    });
  }
  public async adminTestimonials(input: TestimonialQuery): Promise<unknown> {
    const where = input.status ? { status: input.status } : {};
    const [items, total] = await this.client.$transaction([
      this.client.testimonial.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.client.testimonial.count({ where }),
    ]);
    return { items, total, page: input.page, pageSize: input.pageSize };
  }
  public async moderate(actorId: string, id: string, input: ModerationInput): Promise<unknown> {
    try {
      return await this.client.testimonial.update({
        where: { id },
        data: { status: input.status, moderatedById: actorId, moderatedAt: new Date() },
      });
    } catch (error) {
      this.notFound(error, 'التقييم غير موجود');
    }
  }
  public async createFaq(input: FaqInput): Promise<unknown> {
    try {
      return await this.client.fAQ.create({ data: input });
    } catch (error) {
      this.faqError(error);
    }
  }
  public async updateFaq(id: string, input: UpdateFaqInput): Promise<unknown> {
    try {
      return await this.client.fAQ.update({
        where: { id },
        data: {
          ...(input.question !== undefined ? { question: input.question } : {}),
          ...(input.answer !== undefined ? { answer: input.answer } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
    } catch (error) {
      this.faqError(error);
    }
  }
  public async deleteFaq(id: string): Promise<void> {
    try {
      await this.client.fAQ.delete({ where: { id } });
    } catch (error) {
      this.notFound(error, 'السؤال غير موجود');
    }
  }
  public publicFaqs(): Promise<unknown> {
    return this.client.fAQ.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }
  public setSetting(actorId: string, key: string, input: SettingInput): Promise<unknown> {
    const value = input.value as Prisma.InputJsonValue;
    return this.client.platformSetting.upsert({
      where: { key },
      create: { key, value, description: input.description ?? null, updatedById: actorId },
      update: {
        value,
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedById: actorId,
      },
    });
  }
  public publicSettings(): Promise<unknown> {
    return this.client.platformSetting.findMany({
      where: { key: { in: publicSettingKeys } },
      select: { key: true, value: true },
      orderBy: { key: 'asc' },
    });
  }
  public async notifications(userId: string, input: NotificationQuery): Promise<unknown> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(input.read === 'true'
        ? { readAt: { not: null } }
        : input.read === 'false'
          ? { readAt: null }
          : {}),
    };
    const [items, total, unread] = await this.client.$transaction([
      this.client.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.client.notification.count({ where }),
      this.client.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, total, unread, page: input.page, pageSize: input.pageSize };
  }
  public async readNotification(userId: string, id: string): Promise<unknown> {
    await this.client.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    const notification = await this.client.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundError('الإشعار غير موجود');
    return notification;
  }
  private faqError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictError('ترتيب السؤال مستخدم بالفعل');
    this.notFound(error, 'السؤال غير موجود');
  }
  private notFound(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
      throw new NotFoundError(message);
    throw error;
  }
}
