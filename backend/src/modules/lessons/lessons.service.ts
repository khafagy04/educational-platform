import { Service } from '../../core/service.js';
import { NotFoundError } from '../../errors/application-error.js';
import type { StorageProvider } from '../../integrations/storage/storage.provider.js';
import { toSlug } from '../../utils/slug.js';
import type { LessonsRepositoryPort } from './lessons.repository.js';
import type {
  CreateLessonInput,
  ReorderLessonsInput,
  UpdateLessonInput,
} from './lessons.validators.js';

export class LessonsService extends Service<LessonsRepositoryPort> {
  public constructor(
    repository: LessonsRepositoryPort,
    private readonly storage: StorageProvider,
  ) {
    super(repository);
  }
  public async list(moduleId: string) {
    await this.assertModule(moduleId);
    return this.repository.list(moduleId);
  }
  public async get(id: string) {
    const value = await this.repository.findById(id);
    if (!value) throw new NotFoundError('الدرس غير موجود');
    return value;
  }
  public async create(moduleId: string, input: CreateLessonInput) {
    await this.assertModule(moduleId);
    return this.repository.create(moduleId, { ...input, slug: input.slug ?? toSlug(input.title) });
  }
  public async update(id: string, input: UpdateLessonInput) {
    await this.get(id);
    return this.repository.update(id, {
      ...input,
      ...(input.title && !input.slug ? { slug: toSlug(input.title) } : {}),
    });
  }
  public async reorder(moduleId: string, input: ReorderLessonsInput): Promise<void> {
    await this.assertModule(moduleId);
    await this.repository.reorder(moduleId, input);
  }
  public async delete(id: string): Promise<void> {
    const lesson = await this.get(id);
    await this.repository.delete(id);
    await Promise.all(lesson.attachments.map(({ fileKey }) => this.storage.delete(fileKey)));
  }
  private async assertModule(id: string): Promise<void> {
    if (!(await this.repository.moduleExists(id))) throw new NotFoundError('الوحدة غير موجودة');
  }
}
