import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import {
  CourseStatus,
  EnrollmentStatus,
  LessonType,
  OrderStatus,
  UserRole,
  VideoProvider as VideoProviderName,
  VideoStatus,
} from '../../generated/prisma/enums.js';
import type {
  PlaybackGrant,
  VideoProvider,
  VideoUploadInput,
  VideoUploadResult,
} from '../../integrations/video-provider/video.provider.js';
import { database } from '../../lib/database.js';
import { tokenService } from '../../middleware/auth.js';

class FakeVideoProvider implements VideoProvider {
  public readonly deleted: string[] = [];
  private uploadNumber = 0;

  public async uploadVideo(_input: VideoUploadInput): Promise<VideoUploadResult> {
    void _input;
    this.uploadNumber += 1;
    await Promise.resolve();
    return {
      provider: VideoProviderName.CLOUDFLARE_STREAM,
      providerVideoId: `phase-6-private-asset-${String(this.uploadNumber)}`,
      status: VideoStatus.READY,
      uploadUrl: `https://upload.example.invalid/one-time-${String(this.uploadNumber)}`,
      uploadExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  public async getPlaybackToken(
    _providerVideoId: string,
    ttlSeconds: number,
  ): Promise<PlaybackGrant> {
    await Promise.resolve();
    return {
      token: 'short-lived-playback-token',
      playbackUrl: 'https://video.example.invalid/short-lived-playback-token/iframe',
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  public async deleteVideo(providerVideoId: string): Promise<void> {
    this.deleted.push(providerVideoId);
    await Promise.resolve();
  }
}

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const provider = new FakeVideoProvider();
const app = createApp({ videoProvider: provider });
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const courseSlug = 'phase-6-secure-video-course';
const outsiderEmail = 'phase-6-outsider@example.local';
let instructorToken = '';
let studentToken = '';
let outsiderToken = '';
let courseId = '';
let lessonId = '';
let enrollmentId = '';
let orderId = '';

describe.skipIf(!runDatabaseTests)('Phase 6 secure video playback', () => {
  beforeAll(async () => {
    const previous = await database.course.findUnique({ where: { slug: courseSlug } });
    if (previous) {
      await database.enrollment.deleteMany({ where: { courseId: previous.id } });
      await database.order.deleteMany({ where: { courseId: previous.id } });
      await database.course.delete({ where: { id: previous.id } });
    }
    await database.user.deleteMany({ where: { email: outsiderEmail } });

    const [instructor, student, subject] = await Promise.all([
      database.user.findFirstOrThrow({ where: { role: UserRole.INSTRUCTOR } }),
      database.user.findFirstOrThrow({ where: { role: UserRole.STUDENT } }),
      database.subject.findFirstOrThrow({ include: { grade: true } }),
    ]);
    const outsider = await database.user.create({
      data: {
        name: 'طالب خارج المساق',
        email: outsiderEmail,
        passwordHash: 'not-used-by-this-test',
        role: UserRole.STUDENT,
        emailVerifiedAt: new Date(),
      },
    });
    const course = await database.course.create({
      data: {
        gradeId: subject.gradeId,
        subjectId: subject.id,
        createdById: instructor.id,
        title: 'مساق الفيديو الآمن للمرحلة السادسة',
        slug: courseSlug,
        description: 'مساق مخصص لاختبار تفويض تشغيل الفيديو دون كشف معرف المزود.',
        price: '100.00',
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    courseId = course.id;
    const module = await database.courseModule.create({
      data: { courseId, title: 'وحدة الفيديو الآمن', sortOrder: 1 },
    });
    const lesson = await database.lesson.create({
      data: {
        moduleId: module.id,
        title: 'درس محمي',
        slug: 'protected-video',
        type: LessonType.VIDEO,
        sortOrder: 1,
      },
    });
    lessonId = lesson.id;
    const order = await database.order.create({
      data: {
        userId: student.id,
        courseId,
        status: OrderStatus.PAID,
        amount: '100.00',
        courseTitleSnapshot: course.title,
        paidAt: new Date(),
      },
    });
    orderId = order.id;
    const enrollment = await database.enrollment.create({
      data: {
        userId: student.id,
        courseId,
        orderId,
        status: EnrollmentStatus.ACTIVE,
        purchasedPrice: '100.00',
        startsAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    enrollmentId = enrollment.id;
    instructorToken = tokenService.createAccessToken(instructor.id, instructor.role);
    studentToken = tokenService.createAccessToken(student.id, student.role);
    outsiderToken = tokenService.createAccessToken(outsider.id, outsider.role);
  });

  afterAll(async () => {
    if (enrollmentId) await database.enrollment.deleteMany({ where: { id: enrollmentId } });
    if (orderId) await database.order.deleteMany({ where: { id: orderId } });
    if (courseId) await database.course.deleteMany({ where: { id: courseId } });
    await database.user.deleteMany({ where: { email: outsiderEmail } });
    await database.$disconnect();
  });

  it('provisions a private one-time upload without returning the provider asset id', async () => {
    await request(app).post(`/api/v1/lessons/${lessonId}/video`).send({}).expect(401);
    const response = await request(app)
      .post(`/api/v1/lessons/${lessonId}/video`)
      .set(auth(instructorToken))
      .send({ maxDurationSeconds: 3600 })
      .expect(201);
    const serialized = JSON.stringify(response.body);
    expect(serialized).toContain('one-time-1');
    expect(serialized).not.toContain('phase-6-private-asset-1');
    expect(serialized).not.toContain('providerVideoId');
  });

  it('requires authentication and an active, non-expired enrollment', async () => {
    await request(app).get(`/api/v1/lessons/${lessonId}/video-token`).expect(401);
    await request(app)
      .get(`/api/v1/lessons/${lessonId}/video-token`)
      .set(auth(outsiderToken))
      .expect(403);
    await database.enrollment.update({
      where: { id: enrollmentId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await request(app)
      .get(`/api/v1/lessons/${lessonId}/video-token`)
      .set(auth(studentToken))
      .expect(403);
    await database.enrollment.update({
      where: { id: enrollmentId },
      data: { expiresAt: new Date(Date.now() + 86_400_000) },
    });
  });

  it('returns an enrolled student a short-lived grant without the raw asset id', async () => {
    const before = Date.now();
    const response = await request(app)
      .get(`/api/v1/lessons/${lessonId}/video-token`)
      .set(auth(studentToken))
      .expect(200);
    const body = response.body as {
      data: { playback: { token: string; url: string; expiresAt: string } };
    };
    expect(body.data.playback.token).toBe('short-lived-playback-token');
    expect(new Date(body.data.playback.expiresAt).getTime()).toBeGreaterThanOrEqual(
      before + 590_000,
    );
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('phase-6-private-asset-1');
    expect(serialized).not.toContain('providerVideoId');
  });

  it('replaces and deletes provider assets through the provider boundary', async () => {
    await request(app)
      .post(`/api/v1/lessons/${lessonId}/video`)
      .set(auth(instructorToken))
      .send({ maxDurationSeconds: 1800 })
      .expect(201);
    expect(provider.deleted).toContain('phase-6-private-asset-1');
    await request(app)
      .delete(`/api/v1/lessons/${lessonId}/video`)
      .set(auth(instructorToken))
      .expect(204);
    expect(provider.deleted).toContain('phase-6-private-asset-2');
  });
});
