import { Service } from '../../core/service.js';
import { NotFoundError } from '../../errors/application-error.js';
import type { ModulesRepositoryPort } from './modules.repository.js';
import type {
  CreateModuleInput,
  ReorderModulesInput,
  UpdateModuleInput,
} from './modules.validators.js';

export class ModulesService extends Service<ModulesRepositoryPort> {
  public constructor(repository: ModulesRepositoryPort) {
    super(repository);
  }
  public async list(courseId: string) {
    await this.assertCourse(courseId);
    return this.repository.list(courseId);
  }
  public async get(id: string) {
    const value = await this.repository.findById(id);
    if (!value) throw new NotFoundError('الوحدة غير موجودة');
    return value;
  }
  public async create(courseId: string, input: CreateModuleInput) {
    await this.assertCourse(courseId);
    return this.repository.create(courseId, input);
  }
  public async update(id: string, input: UpdateModuleInput) {
    await this.get(id);
    return this.repository.update(id, input);
  }
  public async reorder(courseId: string, input: ReorderModulesInput): Promise<void> {
    await this.assertCourse(courseId);
    await this.repository.reorder(courseId, input);
  }
  public async delete(id: string): Promise<void> {
    await this.get(id);
    await this.repository.delete(id);
  }
  private async assertCourse(id: string): Promise<void> {
    if (!(await this.repository.courseExists(id))) throw new NotFoundError('المساق غير موجود');
  }
}
