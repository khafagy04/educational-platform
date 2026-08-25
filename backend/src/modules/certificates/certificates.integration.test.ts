import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { CourseStatus, OrderStatus, UserRole } from '../../generated/prisma/enums.js';
import type { StorageProvider, StoredObject } from '../../integrations/storage/storage.provider.js';
import { database } from '../../lib/database.js';
import { tokenService } from '../../middleware/auth.js';

class CertificateMemoryStorage implements StorageProvider {
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
  public async createSignedDownloadUrl(): Promise<string> {
    await Promise.resolve();
    return 'http://localhost:4000/api/v1/private-storage/phase10-valid-signed-token';
  }
  public async readSignedDownload(
    token: string,
  ): Promise<{ body: Buffer; mimeType: string } | null> {
    if (token !== 'phase10-valid-signed-token') return null;
    const body: Buffer | undefined = this.objects.values().next().value;
    await Promise.resolve();
    return body ? { body, mimeType: 'application/pdf' } : null;
  }
}

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const slug = 'phase-10-certificate-course';
const email = 'phase-10-student@example.local';
const storage = new CertificateMemoryStorage();
const app = createApp({ storage });
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
let token = '';
let nonOwnerToken = '';
let courseId = '';
let lessonId = '';
let orderId = '';
let certificateId = '';
let certificateNumber = '';

describe.skipIf(!runDatabaseTests)('Phase 10 certificates', () => {
  beforeAll(async () => {
    const stale = await database.course.findUnique({ where: { slug } });
    if (stale) {
      await database.certificate.deleteMany({ where: { courseId: stale.id } });
      await database.enrollment.deleteMany({ where: { courseId: stale.id } });
      await database.order.deleteMany({ where: { courseId: stale.id } });
      await database.course.delete({ where: { id: stale.id } });
    }
    await database.user.deleteMany({ where: { email } });
    const [instructor, subject] = await Promise.all([
      database.user.findFirstOrThrow({ where: { role: UserRole.INSTRUCTOR } }),
      database.subject.findFirstOrThrow(),
    ]);
    nonOwnerToken = tokenService.createAccessToken(instructor.id, instructor.role);
    const user = await database.user.create({
      data: {
        name: 'ليلى أحمد',
        email,
        passwordHash: 'not-used',
        role: UserRole.STUDENT,
        emailVerifiedAt: new Date(),
        wallet: { create: {} },
      },
    });
    token = tokenService.createAccessToken(user.id, user.role);
    const course = await database.course.create({
      data: {
        gradeId: subject.gradeId,
        subjectId: subject.id,
        createdById: instructor.id,
        title: 'الرياضيات المتقدمة',
        slug,
        description: 'مساق شهادة المرحلة العاشرة.',
        price: '10.00',
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    courseId = course.id;
    const module = await database.courseModule.create({
      data: { courseId, title: 'وحدة الشهادة', sortOrder: 1 },
    });
    const lesson = await database.lesson.create({
      data: {
        moduleId: module.id,
        title: 'الدرس المطلوب',
        slug: 'required',
        type: 'TEXT',
        textContent: 'محتوى',
        sortOrder: 1,
      },
    });
    lessonId = lesson.id;
    const order = await database.order.create({
      data: {
        userId: user.id,
        courseId,
        status: OrderStatus.PAID,
        amount: '10.00',
        courseTitleSnapshot: course.title,
        paidAt: new Date(),
      },
    });
    orderId = order.id;
    await database.enrollment.create({
      data: {
        userId: user.id,
        courseId,
        orderId,
        purchasedPrice: '10.00',
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
  });

  afterAll(async () => {
    await database.certificate.deleteMany({ where: { courseId } });
    await database.enrollment.deleteMany({ where: { courseId } });
    await database.order.deleteMany({ where: { id: orderId } });
    await database.course.deleteMany({ where: { id: courseId } });
    await database.user.deleteMany({ where: { email } });
    await database.$disconnect();
  });

  it('issues and stores a real PDF exactly when the course completes', async () => {
    await request(app)
      .post(`/api/v1/lessons/${lessonId}/progress`)
      .set(auth(token))
      .send({ progressPct: 100, lastPositionSec: 0, watchedSeconds: 60, completed: true })
      .expect(200);
    const certificate = await database.certificate.findFirstOrThrow({ where: { courseId } });
    certificateId = certificate.id;
    certificateNumber = certificate.certificateNumber;
    expect(certificate.status).toBe('GENERATED');
    expect(certificate.fileKey).toMatch(/^certificates\/edu-\d{4}-[a-f0-9]{8}\.pdf$/u);
    const pdf = storage.objects.get(certificate.fileKey ?? '');
    expect(pdf?.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf?.length).toBeGreaterThan(10_000);
  });

  it('verifies publicly with a masked name and never exposes the private file key', async () => {
    const response = await request(app)
      .get(`/api/v1/certificates/${certificateNumber}`)
      .expect(200);
    expect(JSON.stringify(response.body)).toContain('ل*** أ***');
    expect(JSON.stringify(response.body)).not.toContain('fileKey');
  });

  it('returns an owner-only, short-lived link that downloads the PDF', async () => {
    const response = await request(app)
      .get(`/api/v1/me/certificates/${certificateId}/download`)
      .set(auth(token))
      .expect(200);
    const body = response.body as { data: { download: { url: string; expiresInSeconds: number } } };
    expect(body.data.download.expiresInSeconds).toBe(300);
    await request(app)
      .get(new URL(body.data.download.url).pathname)
      .expect(200)
      .expect('Content-Type', /application\/pdf/u);
    await request(app).get(`/api/v1/me/certificates/${certificateId}/download`).expect(401);
    await request(app)
      .get(`/api/v1/me/certificates/${certificateId}/download`)
      .set(auth(nonOwnerToken))
      .expect(404);
  });
});
