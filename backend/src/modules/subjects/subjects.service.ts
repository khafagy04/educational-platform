import { Service } from '../../core/service.js';
import { NotFoundError } from '../../errors/application-error.js';
import type { SubjectsRepositoryPort } from './subjects.repository.js';
import type { CreateSubjectInput, UpdateSubjectInput } from './subjects.validators.js';

export class SubjectsService extends Service<SubjectsRepositoryPort> {
  public constructor(repository: SubjectsRepositoryPort) {
    super(repository);
  }
  public list(gradeId?: string) {
    return this.repository.list(gradeId);
  }
  public async get(id: string) {
    const value = await this.repository.findById(id);
    if (!value) throw new NotFoundError('المادة غير موجودة');
    return value;
  }
  public async create(input: CreateSubjectInput) {
    if (!(await this.repository.gradeExists(input.gradeId)))
      throw new NotFoundError('الصف غير موجود');
    return this.repository.create(input);
  }
  public async update(id: string, input: UpdateSubjectInput) {
    await this.get(id);
    if (input.gradeId && !(await this.repository.gradeExists(input.gradeId))) {
      throw new NotFoundError('الصف غير موجود');
    }
    return this.repository.update(id, input);
  }
  public async delete(id: string): Promise<void> {
    await this.get(id);
    await this.repository.delete(id);
  }
}
