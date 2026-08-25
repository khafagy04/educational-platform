import { Repository } from '../../core/repository.js';
import { ConflictError } from '../../errors/application-error.js';
import { Prisma, type Grade, type PrismaClient } from '../../generated/prisma/client.js';
import type { CreateGradeInput, UpdateGradeInput } from './grades.validators.js';

export type GradesRepositoryPort = {
  list(): Promise<Grade[]>;
  findById(id: string): Promise<Grade | null>;
  create(input: CreateGradeInput): Promise<Grade>;
  update(id: string, input: UpdateGradeInput): Promise<Grade>;
  delete(id: string): Promise<void>;
};

export class GradesRepository extends Repository<PrismaClient> implements GradesRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public list(): Promise<Grade[]> {
    return this.client.grade.findMany({ orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }] });
  }

  public findById(id: string): Promise<Grade | null> {
    return this.client.grade.findUnique({ where: { id } });
  }

  public async create(input: CreateGradeInput): Promise<Grade> {
    try {
      return await this.client.grade.create({ data: input });
    } catch (error) {
      this.translateConflict(error);
    }
  }

  public async update(id: string, input: UpdateGradeInput): Promise<Grade> {
    try {
      const data: Prisma.GradeUpdateInput = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.stage !== undefined ? { stage: input.stage } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      };
      return await this.client.grade.update({ where: { id }, data });
    } catch (error) {
      this.translateConflict(error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.client.grade.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError('لا يمكن حذف صف مرتبط بطلاب أو مواد أو مساقات');
      }
      throw error;
    }
  }

  private translateConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('الاسم المختصر أو ترتيب الصف مستخدم بالفعل');
    }
    throw error;
  }
}
