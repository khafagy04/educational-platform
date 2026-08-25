import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import {
  CourseStatus,
  EnrollmentStatus,
  NotificationType,
  OrderStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { tokenService } from '../../middleware/auth.js';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const slug = 'phase-11-admin-content-course';
const email = 'phase-11-student@example.local';
const settingKeys = ['homepage.satisfactionPct', 'private.smtpSecret'];
const app = createApp();
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
let studentToken = '';
let staffToken = '';
let userId = '';
let courseId = '';
let orderId = '';
let testimonialId = '';
let notificationId = '';
const faqIds: string[] = [];

describe.skipIf(!runDatabaseTests)('Phase 11 admin content and notifications', () => {
  beforeAll(async () => {
    const stale = await database.course.findUnique({ where: { slug } });
    if (stale) {
      await database.enrollment.deleteMany({ where: { courseId: stale.id } });
      await database.order.deleteMany({ where: { courseId: stale.id } });
      await database.course.delete({ where: { id: stale.id } });
    }
    await database.user.deleteMany({ where: { email } });
    await database.fAQ.deleteMany({ where: { sortOrder: { in: [11_001, 11_002] } } });
    await database.platformSetting.deleteMany({ where: { key: { in: settingKeys } } });
    const [instructor, subject] = await Promise.all([
      database.user.findFirstOrThrow({ where: { role: UserRole.INSTRUCTOR } }),
      database.subject.findFirstOrThrow(),
    ]);
    staffToken = tokenService.createAccessToken(instructor.id, instructor.role);
    const user = await database.user.create({
      data: {
        name: 'طالب المحتوى',
        email,
        passwordHash: 'not-used',
        role: UserRole.STUDENT,
        emailVerifiedAt: new Date(),
        wallet: { create: {} },
      },
    });
    userId = user.id;
    studentToken = tokenService.createAccessToken(user.id, user.role);
    const course = await database.course.create({
      data: {
        gradeId: subject.gradeId,
        subjectId: subject.id,
        createdById: instructor.id,
        title: 'مساق التقييم المكتمل',
        slug,
        description: 'مساق لاختبار إدارة المحتوى والإشعارات.',
        price: '15.00',
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    courseId = course.id;
    const order = await database.order.create({
      data: {
        userId,
        courseId,
        status: OrderStatus.PAID,
        amount: '15.00',
        courseTitleSnapshot: course.title,
        paidAt: new Date(),
      },
    });
    orderId = order.id;
    await database.enrollment.create({
      data: {
        userId,
        courseId,
        orderId,
        status: EnrollmentStatus.COMPLETED,
        purchasedPrice: '15.00',
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
        completedAt: new Date(),
      },
    });
    const notification = await database.notification.create({
      data: {
        userId,
        type: NotificationType.GENERIC,
        title: 'إشعار تجريبي',
        body: 'هذا إشعار غير مقروء لاختبار المرشحات.',
      },
    });
    notificationId = notification.id;
  });

  afterAll(async () => {
    await database.fAQ.deleteMany({ where: { id: { in: faqIds } } });
    await database.platformSetting.deleteMany({ where: { key: { in: settingKeys } } });
    await database.enrollment.deleteMany({ where: { courseId } });
    await database.order.deleteMany({ where: { id: orderId } });
    await database.course.deleteMany({ where: { id: courseId } });
    await database.user.deleteMany({ where: { email } });
    await database.$disconnect();
  });

  it('holds completed-student testimonials for moderation before public display', async () => {
    const submitted = await request(app)
      .post('/api/v1/testimonials')
      .set(auth(studentToken))
      .send({ courseId, rating: 5, comment: 'مساق ممتاز وشرح واضح ومفيد جداً.' })
      .expect(201);
    testimonialId = (submitted.body as { data: { testimonial: { id: string } } }).data.testimonial
      .id;
    expect(
      JSON.stringify((await request(app).get('/api/v1/testimonials').expect(200)).body),
    ).not.toContain(testimonialId);
    await request(app)
      .patch(`/api/v1/admin/testimonials/${testimonialId}`)
      .set(auth(staffToken))
      .send({ status: 'APPROVED' })
      .expect(200);
    expect(
      JSON.stringify((await request(app).get('/api/v1/testimonials').expect(200)).body),
    ).toContain(testimonialId);
  });

  it('provides staff FAQ CRUD and only active sorted public entries', async () => {
    for (const [sortOrder, isActive] of [
      [11_002, true],
      [11_001, false],
    ] as const) {
      const response = await request(app)
        .post('/api/v1/admin/faqs')
        .set(auth(staffToken))
        .send({
          question: `سؤال ${String(sortOrder)}`,
          answer: 'إجابة إدارية موثقة.',
          sortOrder,
          isActive,
        })
        .expect(201);
      faqIds.push((response.body as { data: { faq: { id: string } } }).data.faq.id);
    }
    const publicResponse = await request(app).get('/api/v1/faqs').expect(200);
    expect(JSON.stringify(publicResponse.body)).toContain('11002');
    expect(JSON.stringify(publicResponse.body)).not.toContain('11001');
  });

  it('publishes only whitelisted manual settings and supports notification read state', async () => {
    await request(app)
      .put('/api/v1/admin/settings/homepage.satisfactionPct')
      .set(auth(staffToken))
      .send({ value: 98 })
      .expect(200);
    await request(app)
      .put('/api/v1/admin/settings/private.smtpSecret')
      .set(auth(staffToken))
      .send({ value: 'never-public' })
      .expect(200);
    const settings = await request(app).get('/api/v1/settings/public').expect(200);
    expect(JSON.stringify(settings.body)).toContain('98');
    expect(JSON.stringify(settings.body)).not.toContain('never-public');
    const unread = await request(app)
      .get('/api/v1/me/notifications?read=false')
      .set(auth(studentToken))
      .expect(200);
    expect(JSON.stringify(unread.body)).toContain(notificationId);
    await request(app)
      .post(`/api/v1/me/notifications/${notificationId}/read`)
      .set(auth(studentToken))
      .expect(200);
    const after = await request(app)
      .get('/api/v1/me/notifications?read=false')
      .set(auth(studentToken))
      .expect(200);
    expect(JSON.stringify(after.body)).not.toContain(notificationId);
  });
});
