import { Repository } from '../../core/repository.js';
import { ConflictError } from '../../errors/application-error.js';
import { Prisma, type CourseModule, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  CreateModuleInput,
  ReorderModulesInput,
  UpdateModuleInput,
} from './modules.validators.js';

export type ModulesRepositoryPort = {
  courseExists(id: string): Promise<boolean>;
  list(courseId: string): Promise<CourseModule[]>;
  findById(id: string): Promise<CourseModule | null>;
  create(courseId: string, input: CreateModuleInput): Promise<CourseModule>;
  update(id: string, input: UpdateModuleInput): Promise<CourseModule>;
  reorder(courseId: string, input: ReorderModulesInput): Promise<void>;
  delete(id: string): Promise<void>;
};

export class ModulesRepository extends Repository<PrismaClient> implements ModulesRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }
  public async courseExists(id: string): Promise<boolean> {
    return (await this.client.course.count({ where: { id } })) === 1;
  }
  public list(courseId: string): Promise<CourseModule[]> {
    return this.client.courseModule.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
  }
  public findById(id: string): Promise<CourseModule | null> {
    return this.client.courseModule.findUnique({ where: { id } });
  }
  public async create(courseId: string, input: CreateModuleInput): Promise<CourseModule> {
    try {
      return await this.client.courseModule.create({
        data: {
          courseId,
          title: input.title,
          sortOrder: input.sortOrder,
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });
    } catch (error) {
      this.translate(error);
    }
  }
  public async update(id: string, input: UpdateModuleInput): Promise<CourseModule> {
    try {
      const data: Prisma.CourseModuleUpdateInput = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      };
      return await this.client.courseModule.update({ where: { id }, data });
    } catch (error) {
      this.translate(error);
    }
  }
  public async reorder(courseId: string, input: ReorderModulesInput): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      const ids = input.items.map((item) => item.id);
      const count = await transaction.courseModule.count({ where: { courseId, id: { in: ids } } });
      const total = await transaction.courseModule.count({ where: { courseId } });
      if (count !== ids.length || total !== ids.length) {
        throw new ConflictError('يجب إرسال جميع وحدات المساق مرة واحدة دون عناصر خارجية');
      }
      for (const [index, item] of input.items.entries()) {
        await transaction.courseModule.update({
          where: { id: item.id },
          data: { sortOrder: -index - 1 },
        });
      }
      for (const item of input.items) {
        await transaction.courseModule.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
      }
    });
  }
  public async delete(id: string): Promise<void> {
    await this.client.courseModule.delete({ where: { id } });
  }
  private translate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('ترتيب الوحدة مستخدم بالفعل داخل المساق');
    }
    throw error;
  }
}
