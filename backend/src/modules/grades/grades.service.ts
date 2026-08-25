import { Service } from '../../core/service.js';
import { NotFoundError } from '../../errors/application-error.js';
import type { GradesRepositoryPort } from './grades.repository.js';
import type { CreateGradeInput, UpdateGradeInput } from './grades.validators.js';

export class GradesService extends Service<GradesRepositoryPort> {
  public constructor(repository: GradesRepositoryPort) {
    super(repository);
  }

  public list() {
    return this.repository.list();
  }

  public async get(id: string) {
    const grade = await this.repository.findById(id);
    if (!grade) throw new NotFoundError('الصف الدراسي غير موجود');
    return grade;
  }

  public create(input: CreateGradeInput) {
    return this.repository.create(input);
  }

  public async update(id: string, input: UpdateGradeInput) {
    await this.get(id);
    return this.repository.update(id, input);
  }

  public async delete(id: string): Promise<void> {
    await this.get(id);
    await this.repository.delete(id);
  }
}
