import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import {
  CourseStatus,
  EnrollmentStatus,
  LessonType,
  OrderStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import type {
  DomainEvent,
  DomainEventPublisher,
} from '../../integrations/events/domain-event.publisher.js';
import { database } from '../../lib/database.js';
import { tokenService } from '../../middleware/auth.js';

class CapturingEvents implements DomainEventPublisher {
  public readonly events: DomainEvent[] = [];
  public async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
    await Promise.resolve();
  }
}

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const slug = 'phase-8-progress-course';
const events = new CapturingEvents();
const app = createApp({ domainEvents: events });
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
let token = '';
let userId = '';
let courseId = '';
let orderId = '';
let firstLessonId = '';
let secondLessonId = '';

describe.skipIf(!runDatabaseTests)('Phase 8 progress and dashboard', () => {
  beforeAll(async () => {
    const stale = await database.course.findUnique({ where: { slug } });
    if (stale) {
      await database.enrollment.deleteMany({ where: { courseId: stale.id } });
      await database.order.deleteMany({ where: { courseId: stale.id } });
      await database.course.delete({ where: { id: stale.id } });
    }
    const [student, instructor, subject] = await Promise.all([
      database.user.findFirstOrThrow({ where: { role: UserRole.STUDENT } }),
      database.user.findFirstOrThrow({ where: { role: UserRole.INSTRUCTOR } }),
      database.subject.findFirstOrThrow(),
    ]);
    userId = student.id;
    token = tokenService.createAccessToken(student.id, student.role);
    const course = await database.course.create({
      data: {
        gradeId: subject.gradeId,
        subjectId: subject.id,
        createdById: instructor.id,
        title: 'مساق تقدم المرحلة الثامنة',
        slug,
        description: 'مساق مخصص للتحقق من الحفظ والاستئناف واكتمال الدروس المطلوبة.',
        price: '50.00',
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    courseId = course.id;
    const module = await database.courseModule.create({
      data: { courseId, title: 'وحدة التقدم', sortOrder: 1 },
    });
    const [first, second] = await Promise.all([
      database.lesson.create({
        data: {
          moduleId: module.id,
          title: 'الدرس الأول',
          slug: 'first',
          type: LessonType.VIDEO,
          sortOrder: 1,
        },
      }),
      database.lesson.create({
        data: {
          moduleId: module.id,
          title: 'الدرس الثاني',
          slug: 'second',
          type: LessonType.TEXT,
          textContent: 'محتوى',
          sortOrder: 2,
        },
      }),
    ]);
    firstLessonId = first.id;
    secondLessonId = second.id;
    const order = await database.order.create({
      data: {
        userId,
        courseId,
        status: OrderStatus.PAID,
        amount: '50.00',
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
        purchasedPrice: '50.00',
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
  });

  afterAll(async () => {
    await database.enrollment.deleteMany({ where: { orderId } });
    await database.order.deleteMany({ where: { id: orderId } });
    await database.course.deleteMany({ where: { id: courseId } });
    await database.$disconnect();
  });

  it('persists monotonic progress and the exact resume position', async () => {
    await request(app)
      .post(`/api/v1/lessons/${firstLessonId}/progress`)
      .set(auth(token))
      .send({ progressPct: 50, lastPositionSec: 120, watchedSeconds: 120, completed: false })
      .expect(200);
    const response = await request(app)
      .get(`/api/v1/courses/${courseId}/progress`)
      .set(auth(token))
      .expect(200);
    const body = response.body as unknown as {
      data: { progress: { overallCompletionPct: number; lessons: { lastPositionSec: number }[] } };
    };
    expect(body.data.progress.overallCompletionPct).toBe(25);
    expect(body.data.progress.lessons[0]?.lastPositionSec).toBe(120);
  });

  it('completes only after every required lesson and emits one stable event', async () => {
    await request(app)
      .post(`/api/v1/lessons/${firstLessonId}/progress`)
      .set(auth(token))
      .send({ progressPct: 100, lastPositionSec: 240, watchedSeconds: 240, completed: true })
      .expect(200);
    expect(events.events).toHaveLength(0);
    await request(app)
      .post(`/api/v1/lessons/${secondLessonId}/progress`)
      .set(auth(token))
      .send({ progressPct: 100, lastPositionSec: 0, watchedSeconds: 60, completed: true })
      .expect(200);
    const enrollment = await database.enrollment.findUniqueOrThrow({ where: { orderId } });
    expect(enrollment.status).toBe(EnrollmentStatus.COMPLETED);
    expect(events.events).toHaveLength(1);
    expect(events.events[0]?.idempotencyKey).toBe(`course-completed:${enrollment.id}`);
    await request(app)
      .post(`/api/v1/lessons/${secondLessonId}/progress`)
      .set(auth(token))
      .send({ progressPct: 100, lastPositionSec: 0, watchedSeconds: 60, completed: true })
      .expect(200);
    expect(events.events).toHaveLength(1);
  });

  it('returns dashboard aggregates backed by persisted activity', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/student/home')
      .set(auth(token))
      .expect(200);
    const body = response.body as unknown as {
      data: { stats: { enrolledCoursesCount: number; totalLearningHours: number } };
    };
    expect(body.data.stats.enrolledCoursesCount).toBeGreaterThanOrEqual(1);
    expect(body.data.stats.totalLearningHours).toBeGreaterThan(0);
  });
});
