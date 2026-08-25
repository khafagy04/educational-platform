import { Repository } from '../../core/repository.js';
import { ConflictError } from '../../errors/application-error.js';
import { Prisma, type PrismaClient, type Subject } from '../../generated/prisma/client.js';
import type { CreateSubjectInput, UpdateSubjectInput } from './subjects.validators.js';

export type SubjectsRepositoryPort = {
  list(gradeId?: string): Promise<Subject[]>;
  findById(id: string): Promise<Subject | null>;
  gradeExists(id: string): Promise<boolean>;
  create(input: CreateSubjectInput): Promise<Subject>;
  update(id: string, input: UpdateSubjectInput): Promise<Subject>;
  delete(id: string): Promise<void>;
};

export class SubjectsRepository extends Repository<PrismaClient> implements SubjectsRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public list(gradeId?: string): Promise<Subject[]> {
    return this.client.subject.findMany({
      where: { isActive: true, ...(gradeId ? { gradeId } : {}) },
      orderBy: [{ gradeId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  public findById(id: string): Promise<Subject | null> {
    return this.client.subject.findUnique({ where: { id } });
  }

  public async gradeExists(id: string): Promise<boolean> {
    return (await this.client.grade.count({ where: { id } })) === 1;
  }

  public async create(input: CreateSubjectInput): Promise<Subject> {
    try {
      return await this.client.subject.create({ data: input });
    } catch (error) {
      this.translate(error);
    }
  }

  public async update(id: string, input: UpdateSubjectInput): Promise<Subject> {
    try {
      const data: Prisma.SubjectUncheckedUpdateInput = {
        ...(input.gradeId !== undefined ? { gradeId: input.gradeId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      };
      return await this.client.subject.update({ where: { id }, data });
    } catch (error) {
      this.translate(error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.client.subject.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError('لا يمكن حذف مادة مرتبطة بمساقات');
      }
      throw error;
    }
  }

  private translate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('اسم المادة المختصر أو ترتيبها مستخدم بالفعل داخل الصف');
    }
    throw error;
  }
}
