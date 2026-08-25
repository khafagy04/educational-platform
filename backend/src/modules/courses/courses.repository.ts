import { Repository } from '../../core/repository.js';
import { ConflictError } from '../../errors/application-error.js';
import { CourseStatus } from '../../generated/prisma/enums.js';
import { Prisma, type Course, type PrismaClient } from '../../generated/prisma/client.js';
import type { CreateCourseInput, UpdateCourseInput } from './courses.validators.js';

export type CourseListFilters = {
  gradeId?: string;
  subjectId?: string;
  search: string;
  minPrice?: number;
  maxPrice?: number;
  pricing: 'all' | 'free' | 'paid';
  sort: 'newest' | 'price-asc' | 'price-desc' | 'popularity';
  page: number;
  pageSize: number;
};

export type CoursesRepositoryPort = {
  listPublished(filters: CourseListFilters): Promise<{ courses: PublicCourse[]; total: number }>;
  findPublishedBySlug(slug: string): Promise<PublicCourseDetail | null>;
  findById(id: string): Promise<Course | null>;
  subjectMatchesGrade(subjectId: string, gradeId: string): Promise<boolean>;
  create(input: CreateCourseInput & { slug: string; createdById: string }): Promise<Course>;
  update(id: string, input: UpdateCourseInput & { publishedAt?: Date | null }): Promise<Course>;
  setThumbnail(id: string, fileKey: string): Promise<Course>;
  listAttachmentKeys(id: string): Promise<string[]>;
  delete(id: string): Promise<void>;
};

const publicCourseSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  price: true,
  currency: true,
  accessDurationDays: true,
  publishedAt: true,
  grade: { select: { id: true, name: true, slug: true, stage: true } },
  subject: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.CourseSelect;

const publicCourseDetailSelect = {
  ...publicCourseSelect,
  modules: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      title: true,
      description: true,
      sortOrder: true,
      lessons: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          type: true,
          durationSec: true,
          isFree: true,
          isRequired: true,
          sortOrder: true,
          attachments: {
            orderBy: { sortOrder: 'asc' as const },
            select: { id: true, title: true, mimeType: true, sizeBytes: true, sortOrder: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CourseSelect;

export type PublicCourse = Prisma.CourseGetPayload<{ select: typeof publicCourseSelect }>;
export type PublicCourseDetail = Prisma.CourseGetPayload<{
  select: typeof publicCourseDetailSelect;
}>;

export class CoursesRepository extends Repository<PrismaClient> implements CoursesRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public async listPublished(
    filters: CourseListFilters,
  ): Promise<{ courses: PublicCourse[]; total: number }> {
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      ...(filters.gradeId ? { gradeId: filters.gradeId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.pricing === 'free'
        ? { price: 0 }
        : filters.pricing === 'paid'
          ? { price: { gt: 0 } }
          : filters.minPrice !== undefined || filters.maxPrice !== undefined
            ? {
                price: {
                  ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
                  ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
                },
              }
            : {}),
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput[] =
      filters.sort === 'price-asc'
        ? [{ price: 'asc' }]
        : filters.sort === 'price-desc'
          ? [{ price: 'desc' }]
          : filters.sort === 'popularity'
            ? [{ views: { _count: 'desc' } }]
            : [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
    const [courses, total] = await this.client.$transaction([
      this.client.course.findMany({
        where,
        select: publicCourseSelect,
        orderBy,
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.client.course.count({ where }),
    ]);
    return { courses, total };
  }

  public findPublishedBySlug(slug: string): Promise<PublicCourseDetail | null> {
    return this.client.course.findFirst({
      where: { slug, status: CourseStatus.PUBLISHED },
      select: publicCourseDetailSelect,
    });
  }

  public findById(id: string): Promise<Course | null> {
    return this.client.course.findUnique({ where: { id } });
  }

  public async subjectMatchesGrade(subjectId: string, gradeId: string): Promise<boolean> {
    return (await this.client.subject.count({ where: { id: subjectId, gradeId } })) === 1;
  }

  public async create(
    input: CreateCourseInput & { slug: string; createdById: string },
  ): Promise<Course> {
    try {
      return await this.client.course.create({
        data: {
          ...input,
          price: new Prisma.Decimal(input.price),
          publishedAt: input.status === CourseStatus.PUBLISHED ? new Date() : null,
        },
      });
    } catch (error) {
      this.translate(error);
    }
  }

  public async update(
    id: string,
    input: UpdateCourseInput & { publishedAt?: Date | null },
  ): Promise<Course> {
    try {
      const data: Prisma.CourseUncheckedUpdateInput = {
        ...(input.gradeId !== undefined ? { gradeId: input.gradeId } : {}),
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
        ...(input.accessDurationDays !== undefined
          ? { accessDurationDays: input.accessDurationDays }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
      };
      return await this.client.course.update({ where: { id }, data });
    } catch (error) {
      this.translate(error);
    }
  }

  public setThumbnail(id: string, thumbnailFileKey: string): Promise<Course> {
    return this.client.course.update({ where: { id }, data: { thumbnailFileKey } });
  }

  public async listAttachmentKeys(id: string): Promise<string[]> {
    const attachments = await this.client.attachment.findMany({
      where: { lesson: { module: { courseId: id } } },
      select: { fileKey: true },
    });
    return attachments.map(({ fileKey }) => fileKey);
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.client.course.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError('لا يمكن حذف مساق له طلبات أو اشتراكات؛ قم بأرشفته');
      }
      throw error;
    }
  }

  private translate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('الاسم المختصر للمساق مستخدم بالفعل');
    }
    throw error;
  }
}
