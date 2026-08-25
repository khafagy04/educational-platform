import { randomUUID } from 'node:crypto';
import { Service } from '../../core/service.js';
import { NotFoundError, ValidationError } from '../../errors/application-error.js';
import { CourseStatus } from '../../generated/prisma/enums.js';
import type { StorageProvider } from '../../integrations/storage/storage.provider.js';
import { toSlug } from '../../utils/slug.js';
import type { CourseListFilters, CoursesRepositoryPort } from './courses.repository.js';
import type { CreateCourseInput, UpdateCourseInput } from './courses.validators.js';

const thumbnailTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class CoursesService extends Service<CoursesRepositoryPort> {
  public constructor(
    repository: CoursesRepositoryPort,
    private readonly storage: StorageProvider,
  ) {
    super(repository);
  }
  public listPublished(filters: CourseListFilters) {
    return this.repository.listPublished(filters);
  }
  public async getPublished(slug: string) {
    const course = await this.repository.findPublishedBySlug(slug);
    if (!course) throw new NotFoundError('المساق المنشور غير موجود');
    return course;
  }
  public async getAdmin(id: string) {
    const course = await this.repository.findById(id);
    if (!course) throw new NotFoundError('المساق غير موجود');
    return course;
  }
  public async create(input: CreateCourseInput, userId: string) {
    await this.assertSubject(input.subjectId, input.gradeId);
    return this.repository.create({
      ...input,
      slug: input.slug ?? toSlug(input.title),
      createdById: userId,
    });
  }
  public async update(id: string, input: UpdateCourseInput) {
    const current = await this.getAdmin(id);
    await this.assertSubject(
      input.subjectId ?? current.subjectId,
      input.gradeId ?? current.gradeId,
    );
    const publishing =
      input.status === CourseStatus.PUBLISHED && current.status !== CourseStatus.PUBLISHED;
    return this.repository.update(id, {
      ...input,
      ...(input.title && !input.slug ? { slug: toSlug(input.title) } : {}),
      ...(publishing ? { publishedAt: new Date() } : {}),
    });
  }
  public async uploadThumbnail(id: string, file: Express.Multer.File) {
    await this.getAdmin(id);
    const extension = thumbnailTypes[file.mimetype];
    if (!extension) throw new ValidationError('صيغة صورة الغلاف غير مسموح بها');
    const key = `courses/${id}/thumbnail-${randomUUID()}.${extension}`;
    await this.storage.upload({ key, body: file.buffer, mimeType: file.mimetype });
    return this.repository.setThumbnail(id, key);
  }
  public async delete(id: string): Promise<void> {
    const course = await this.getAdmin(id);
    const attachmentKeys = await this.repository.listAttachmentKeys(id);
    await this.repository.delete(id);
    await Promise.all([
      ...attachmentKeys.map((key) => this.storage.delete(key)),
      ...(course.thumbnailFileKey ? [this.storage.delete(course.thumbnailFileKey)] : []),
    ]);
  }
  private async assertSubject(subjectId: string, gradeId: string): Promise<void> {
    if (!(await this.repository.subjectMatchesGrade(subjectId, gradeId))) {
      throw new ValidationError('المادة لا تنتمي إلى الصف المحدد');
    }
  }
}
