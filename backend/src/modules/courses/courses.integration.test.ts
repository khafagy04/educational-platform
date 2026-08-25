import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { StorageProvider, StoredObject } from '../../integrations/storage/storage.provider.js';
import { database } from '../../lib/database.js';
import { tokenService } from '../../middleware/auth.js';

class MemoryStorage implements StorageProvider {
  public readonly objects = new Map<string, Buffer>();
  public async upload(input: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<StoredObject> {
    this.objects.set(input.key, input.body);
    await Promise.resolve();
    return { key: input.key, mimeType: input.mimeType, size: input.body.length };
  }
  public async delete(key: string): Promise<void> {
    this.objects.delete(key);
    await Promise.resolve();
  }

  public async createSignedDownloadUrl(key: string): Promise<string> {
    await Promise.resolve();
    return `https://storage.example.invalid/${key}`;
  }

  public async readSignedDownload(): Promise<null> {
    await Promise.resolve();
    return null;
  }
}

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const storage = new MemoryStorage();
const app = createApp({ storage });
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const testSlug = 'phase-5-test-course';
const gradeSlug = 'phase-5-grade';
let accessToken = '';
let gradeId = '';
let subjectId = '';
let courseId = '';
let firstModuleId = '';
let secondModuleId = '';
let videoLessonId = '';
let pdfLessonId = '';

describe.skipIf(!runDatabaseTests)('Phase 5 content hierarchy', () => {
  beforeAll(async () => {
    await database.course.deleteMany({ where: { slug: testSlug } });
    await database.grade.deleteMany({ where: { slug: gradeSlug } });
    const instructor = await database.user.findFirstOrThrow({
      where: { role: UserRole.INSTRUCTOR },
    });
    accessToken = tokenService.createAccessToken(instructor.id, instructor.role);
  });

  afterAll(async () => {
    await database.course.deleteMany({ where: { slug: testSlug } });
    await database.grade.deleteMany({ where: { slug: gradeSlug } });
    await database.$disconnect();
  });

  it('protects writes and supports grade/subject CRUD', async () => {
    await request(app).post('/api/v1/grades').send({}).expect(401);
    const gradeResponse = await request(app)
      .post('/api/v1/grades')
      .set(auth(accessToken))
      .send({
        name: 'صف اختبار المرحلة الخامسة',
        slug: gradeSlug,
        stage: 'SECONDARY',
        sortOrder: 99,
      })
      .expect(201);
    gradeId = (gradeResponse.body as { data: { grade: { id: string } } }).data.grade.id;

    const subjectResponse = await request(app)
      .post('/api/v1/subjects')
      .set(auth(accessToken))
      .send({ gradeId, name: 'مادة اختبار', slug: 'phase-5-subject', sortOrder: 1 })
      .expect(201);
    subjectId = (subjectResponse.body as { data: { subject: { id: string } } }).data.subject.id;
    await request(app)
      .patch(`/api/v1/subjects/${subjectId}`)
      .set(auth(accessToken))
      .send({ name: 'مادة اختبار محدثة' })
      .expect(200);
  });

  it('creates a draft course with thumbnail, modules, lessons, reorder, and attachment', async () => {
    const courseResponse = await request(app)
      .post('/api/v1/courses')
      .set(auth(accessToken))
      .send({
        gradeId,
        subjectId,
        title: 'مساق اختبار المرحلة الخامسة',
        slug: testSlug,
        description: 'وصف واقعي لمساق اختبار إدارة المحتوى في المرحلة الخامسة.',
        price: 275,
        accessDurationDays: 180,
      })
      .expect(201);
    courseId = (courseResponse.body as { data: { course: { id: string } } }).data.course.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/thumbnail`)
      .set(auth(accessToken))
      .attach('file', Buffer.from('fake-webp-thumbnail'), {
        filename: 'cover.webp',
        contentType: 'image/webp',
      })
      .expect(200);

    const first = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set(auth(accessToken))
      .send({ title: 'الوحدة الأولى', sortOrder: 1 })
      .expect(201);
    firstModuleId = (first.body as { data: { module: { id: string } } }).data.module.id;
    const second = await request(app)
      .post(`/api/v1/courses/${courseId}/modules`)
      .set(auth(accessToken))
      .send({ title: 'الوحدة الثانية', sortOrder: 2 })
      .expect(201);
    secondModuleId = (second.body as { data: { module: { id: string } } }).data.module.id;
    await request(app)
      .put(`/api/v1/courses/${courseId}/modules/reorder`)
      .set(auth(accessToken))
      .send({
        items: [
          { id: secondModuleId, sortOrder: 1 },
          { id: firstModuleId, sortOrder: 2 },
        ],
      })
      .expect(200);

    const video = await request(app)
      .post(`/api/v1/modules/${firstModuleId}/lessons`)
      .set(auth(accessToken))
      .send({ title: 'درس فيديو مجاني', type: 'VIDEO', isFree: true, sortOrder: 1 })
      .expect(201);
    videoLessonId = (video.body as { data: { lesson: { id: string } } }).data.lesson.id;
    const pdf = await request(app)
      .post(`/api/v1/modules/${firstModuleId}/lessons`)
      .set(auth(accessToken))
      .send({ title: 'درس ملف مدفوع', type: 'PDF', isFree: false, sortOrder: 2 })
      .expect(201);
    pdfLessonId = (pdf.body as { data: { lesson: { id: string } } }).data.lesson.id;
    await request(app)
      .put(`/api/v1/modules/${firstModuleId}/lessons/reorder`)
      .set(auth(accessToken))
      .send({
        items: [
          { id: pdfLessonId, sortOrder: 1 },
          { id: videoLessonId, sortOrder: 2 },
        ],
      })
      .expect(200);
    await request(app)
      .post(`/api/v1/lessons/${pdfLessonId}/attachments`)
      .set(auth(accessToken))
      .field('title', 'ملف تدريبات خاص')
      .field('sortOrder', '1')
      .attach('file', Buffer.from('%PDF-1.4 phase-five-test'), {
        filename: 'worksheet.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(storage.objects.size).toBe(2);
  });

  it('hides drafts, then exposes the published nested structure without protected keys', async () => {
    await request(app).get(`/api/v1/courses/slug/${testSlug}`).expect(404);
    await request(app)
      .patch(`/api/v1/courses/${courseId}`)
      .set(auth(accessToken))
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const list = await request(app)
      .get(`/api/v1/courses?gradeId=${gradeId}&subjectId=${subjectId}`)
      .expect(200);
    expect(JSON.stringify(list.body)).toContain(testSlug);

    const detail = await request(app).get(`/api/v1/courses/slug/${testSlug}`).expect(200);
    const serialized = JSON.stringify(detail.body);
    expect(serialized).toContain('الوحدة الأولى');
    expect(serialized).toContain('درس فيديو مجاني');
    expect(serialized).toContain('ملف تدريبات خاص');
    expect(serialized).not.toContain('fileKey');
    expect(serialized).not.toContain('thumbnailFileKey');
    expect(serialized).not.toContain('providerVideoId');
    expect(serialized).not.toContain('textContent');
    expect(serialized).not.toMatch(/https?:\/\//);
  });

  it('deletes the hierarchy and its private objects, then deletes references', async () => {
    await request(app).delete(`/api/v1/courses/${courseId}`).set(auth(accessToken)).expect(204);
    expect(storage.objects.size).toBe(0);
    await request(app).delete(`/api/v1/subjects/${subjectId}`).set(auth(accessToken)).expect(204);
    await request(app).delete(`/api/v1/grades/${gradeId}`).set(auth(accessToken)).expect(204);
  });
});
