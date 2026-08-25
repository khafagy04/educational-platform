import { Repository } from '../../core/repository.js';
import { ConflictError } from '../../errors/application-error.js';
import { Prisma, type Lesson, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  CreateLessonInput,
  ReorderLessonsInput,
  UpdateLessonInput,
} from './lessons.validators.js';

export type LessonWithFiles = Lesson & { attachments: { fileKey: string }[] };
export type LessonsRepositoryPort = {
  moduleExists(id: string): Promise<boolean>;
  list(moduleId: string): Promise<Lesson[]>;
  findById(id: string): Promise<LessonWithFiles | null>;
  create(moduleId: string, input: CreateLessonInput & { slug: string }): Promise<Lesson>;
  update(id: string, input: UpdateLessonInput & { slug?: string | undefined }): Promise<Lesson>;
  reorder(moduleId: string, input: ReorderLessonsInput): Promise<void>;
  delete(id: string): Promise<void>;
};

export class LessonsRepository extends Repository<PrismaClient> implements LessonsRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }
  public async moduleExists(id: string): Promise<boolean> {
    return (await this.client.courseModule.count({ where: { id } })) === 1;
  }
  public list(moduleId: string): Promise<Lesson[]> {
    return this.client.lesson.findMany({ where: { moduleId }, orderBy: { sortOrder: 'asc' } });
  }
  public findById(id: string): Promise<LessonWithFiles | null> {
    return this.client.lesson.findUnique({
      where: { id },
      include: { attachments: { select: { fileKey: true } } },
    });
  }
  public async create(
    moduleId: string,
    input: CreateLessonInput & { slug: string },
  ): Promise<Lesson> {
    try {
      return await this.client.lesson.create({
        data: {
          moduleId,
          title: input.title,
          slug: input.slug,
          type: input.type,
          isFree: input.isFree,
          isRequired: input.isRequired,
          sortOrder: input.sortOrder,
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.textContent !== undefined ? { textContent: input.textContent } : {}),
          ...(input.durationSec !== undefined ? { durationSec: input.durationSec } : {}),
        },
      });
    } catch (error) {
      this.translate(error);
    }
  }
  public async update(
    id: string,
    input: UpdateLessonInput & { slug?: string | undefined },
  ): Promise<Lesson> {
    try {
      const data: Prisma.LessonUpdateInput = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.textContent !== undefined ? { textContent: input.textContent } : {}),
        ...(input.durationSec !== undefined ? { durationSec: input.durationSec } : {}),
        ...(input.isFree !== undefined ? { isFree: input.isFree } : {}),
        ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      };
      return await this.client.lesson.update({ where: { id }, data });
    } catch (error) {
      this.translate(error);
    }
  }
  public async reorder(moduleId: string, input: ReorderLessonsInput): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      const ids = input.items.map((item) => item.id);
      const count = await transaction.lesson.count({ where: { moduleId, id: { in: ids } } });
      const total = await transaction.lesson.count({ where: { moduleId } });
      if (count !== ids.length || total !== ids.length) {
        throw new ConflictError('يجب إرسال جميع دروس الوحدة مرة واحدة دون عناصر خارجية');
      }
      for (const [index, item] of input.items.entries()) {
        await transaction.lesson.update({
          where: { id: item.id },
          data: { sortOrder: -index - 1 },
        });
      }
      for (const item of input.items) {
        await transaction.lesson.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
      }
    });
  }
  public async delete(id: string): Promise<void> {
    await this.client.lesson.delete({ where: { id } });
  }
  private translate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('اسم الدرس المختصر أو ترتيبه مستخدم بالفعل داخل الوحدة');
    }
    throw error;
  }
}
