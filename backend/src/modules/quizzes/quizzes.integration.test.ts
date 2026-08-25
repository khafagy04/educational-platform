import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { CourseStatus, OrderStatus, UserRole } from '../../generated/prisma/enums.js';
import { database } from '../../lib/database.js';
import { tokenService } from '../../middleware/auth.js';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const slug = 'phase-9-quizzes-course';
const studentEmail = 'phase-9-student@example.local';
const outsiderEmail = 'phase-9-outsider@example.local';
const app = createApp();
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
let studentToken = '';
let studentUserId = '';
let outsiderToken = '';
let staffToken = '';
let courseId = '';
let moduleId = '';
let orderId = '';
let mcqQuizId = '';
let mixedQuizId = '';
let mixedAttemptId = '';

type AttemptBody = {
  data: {
    attempt: {
      id: string;
      status: string;
      score: string | null;
      maxScore: string;
      attemptQuestions: {
        id: string;
        type: string;
        promptSnapshot: string;
        options: { id: string; textSnapshot: string }[];
      }[];
    };
  };
};

const required = <T>(value: T | undefined): T => {
  expect(value).toBeDefined();
  if (value === undefined) throw new Error('Expected test fixture value');
  return value;
};

describe.skipIf(!runDatabaseTests)('Phase 9 quizzes and grading', () => {
  beforeAll(async () => {
    const stale = await database.course.findUnique({ where: { slug } });
    if (stale) {
      await database.quizAttempt.deleteMany({
        where: { quiz: { module: { courseId: stale.id } } },
      });
      await database.enrollment.deleteMany({ where: { courseId: stale.id } });
      await database.order.deleteMany({ where: { courseId: stale.id } });
      await database.course.delete({ where: { id: stale.id } });
    }
    await database.user.deleteMany({ where: { email: { in: [studentEmail, outsiderEmail] } } });
    const [instructor, subject] = await Promise.all([
      database.user.findFirstOrThrow({ where: { role: UserRole.INSTRUCTOR } }),
      database.subject.findFirstOrThrow(),
    ]);
    staffToken = tokenService.createAccessToken(instructor.id, instructor.role);
    const [student, outsider] = await Promise.all([
      database.user.create({
        data: {
          name: 'طالب اختبارات المرحلة التاسعة',
          email: studentEmail,
          passwordHash: 'not-used',
          role: UserRole.STUDENT,
          emailVerifiedAt: new Date(),
          wallet: { create: {} },
        },
      }),
      database.user.create({
        data: {
          name: 'طالب بلا اشتراك',
          email: outsiderEmail,
          passwordHash: 'not-used',
          role: UserRole.STUDENT,
          emailVerifiedAt: new Date(),
          wallet: { create: {} },
        },
      }),
    ]);
    studentToken = tokenService.createAccessToken(student.id, student.role);
    studentUserId = student.id;
    outsiderToken = tokenService.createAccessToken(outsider.id, outsider.role);
    const course = await database.course.create({
      data: {
        gradeId: subject.gradeId,
        subjectId: subject.id,
        createdById: instructor.id,
        title: 'مساق اختبارات المرحلة التاسعة',
        slug,
        description: 'مساق للتحقق من التصحيح التلقائي والمراجعة اليدوية وحد المحاولات.',
        price: '25.00',
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    courseId = course.id;
    const module = await database.courseModule.create({
      data: { courseId, title: 'وحدة الاختبارات', sortOrder: 1 },
    });
    moduleId = module.id;
    const order = await database.order.create({
      data: {
        userId: student.id,
        courseId,
        status: OrderStatus.PAID,
        amount: '25.00',
        courseTitleSnapshot: course.title,
        paidAt: new Date(),
      },
    });
    orderId = order.id;
    await database.enrollment.create({
      data: {
        userId: student.id,
        courseId,
        orderId,
        purchasedPrice: '25.00',
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
  });

  afterAll(async () => {
    await database.quizAttempt.deleteMany({ where: { quiz: { module: { courseId } } } });
    await database.enrollment.deleteMany({ where: { courseId } });
    await database.order.deleteMany({ where: { courseId } });
    await database.course.deleteMany({ where: { id: courseId } });
    await database.user.deleteMany({ where: { email: { in: [studentEmail, outsiderEmail] } } });
    await database.$disconnect();
  });

  it('supports staff CRUD and rejects publishing an empty quiz', async () => {
    const created = await request(app)
      .post('/api/v1/quizzes')
      .set(auth(staffToken))
      .send({ moduleId, title: 'اختبار فوري', passingScore: 50, maxAttempts: 1 })
      .expect(201);
    mcqQuizId = (created.body as { data: { quiz: { id: string } } }).data.quiz.id;
    await request(app)
      .patch(`/api/v1/quizzes/${mcqQuizId}`)
      .set(auth(staffToken))
      .send({ status: 'PUBLISHED' })
      .expect(409);
    await request(app)
      .post(`/api/v1/quizzes/${mcqQuizId}/questions`)
      .set(auth(staffToken))
      .send({
        type: 'MCQ',
        prompt: 'ما حاصل 2 + 2؟',
        points: 10,
        sortOrder: 1,
        options: [
          { text: '4', isCorrect: true, sortOrder: 1 },
          { text: '5', isCorrect: false, sortOrder: 2 },
        ],
      })
      .expect(201);
    await request(app)
      .patch(`/api/v1/quizzes/${mcqQuizId}`)
      .set(auth(staffToken))
      .send({ status: 'PUBLISHED' })
      .expect(200);
  });

  it('grades MCQ instantly, hides answer keys, and enforces enrollment and maxAttempts', async () => {
    await request(app)
      .post(`/api/v1/quizzes/${mcqQuizId}/attempts`)
      .set(auth(outsiderToken))
      .expect(403);
    const started = await request(app)
      .post(`/api/v1/quizzes/${mcqQuizId}/attempts`)
      .set(auth(studentToken))
      .expect(201);
    expect(JSON.stringify(started.body)).not.toContain('isCorrect');
    const body = started.body as AttemptBody;
    const question = required(body.data.attempt.attemptQuestions[0]);
    const correctOption = required(
      question.options.find(({ textSnapshot }) => textSnapshot === '4'),
    );
    const submitted = await request(app)
      .post(`/api/v1/attempts/${body.data.attempt.id}/submit`)
      .set(auth(studentToken))
      .send({ answers: [{ attemptQuestionId: question.id, selectedOptionId: correctOption.id }] })
      .expect(200);
    const result = submitted.body as AttemptBody;
    expect(result.data.attempt.status).toBe('GRADED');
    expect(result.data.attempt.score).toBe('10');
    expect(JSON.stringify(submitted.body)).not.toContain('AwardedPoints');
    await request(app)
      .post(`/api/v1/quizzes/${mcqQuizId}/attempts`)
      .set(auth(studentToken))
      .expect(409);
  });

  it('keeps mixed attempts pending until every essay is graded manually', async () => {
    const created = await request(app)
      .post('/api/v1/quizzes')
      .set(auth(staffToken))
      .send({ moduleId, title: 'اختبار مختلط', passingScore: 50, maxAttempts: 2 })
      .expect(201);
    mixedQuizId = (created.body as { data: { quiz: { id: string } } }).data.quiz.id;
    await request(app)
      .post(`/api/v1/quizzes/${mixedQuizId}/questions`)
      .set(auth(staffToken))
      .send({
        type: 'MCQ',
        prompt: 'اختر الإجابة الصحيحة',
        points: 4,
        sortOrder: 1,
        options: [
          { text: 'صحيحة', isCorrect: true, sortOrder: 1 },
          { text: 'خاطئة', isCorrect: false, sortOrder: 2 },
        ],
      })
      .expect(201);
    await request(app)
      .post(`/api/v1/quizzes/${mixedQuizId}/questions`)
      .set(auth(staffToken))
      .send({ type: 'ESSAY', prompt: 'اشرح إجابتك', points: 6, sortOrder: 2 })
      .expect(201);
    await request(app)
      .patch(`/api/v1/quizzes/${mixedQuizId}`)
      .set(auth(staffToken))
      .send({ status: 'PUBLISHED' })
      .expect(200);
    const started = await request(app)
      .post(`/api/v1/quizzes/${mixedQuizId}/attempts`)
      .set(auth(studentToken))
      .expect(201);
    const body = started.body as AttemptBody;
    mixedAttemptId = body.data.attempt.id;
    const mcq = required(body.data.attempt.attemptQuestions.find(({ type }) => type === 'MCQ'));
    const essay = required(body.data.attempt.attemptQuestions.find(({ type }) => type === 'ESSAY'));
    const correct = required(mcq.options.find(({ textSnapshot }) => textSnapshot === 'صحيحة'));
    const submitted = await request(app)
      .post(`/api/v1/attempts/${mixedAttemptId}/submit`)
      .set(auth(studentToken))
      .send({
        answers: [
          { attemptQuestionId: mcq.id, selectedOptionId: correct.id },
          { attemptQuestionId: essay.id, essayText: 'إجابة تفسيرية تستحق المراجعة.' },
        ],
      })
      .expect(200);
    const pending = submitted.body as AttemptBody;
    expect(pending.data.attempt.status).toBe('PENDING_REVIEW');
    expect(pending.data.attempt.score).toBeNull();
    expect(JSON.stringify(submitted.body)).not.toContain('AwardedPoints');
    const queue = await request(app)
      .get('/api/v1/admin/attempts?status=PENDING_REVIEW')
      .set(auth(staffToken))
      .expect(200);
    expect(JSON.stringify(queue.body)).toContain(mixedAttemptId);
    const graded = await request(app)
      .post(`/api/v1/admin/attempts/${mixedAttemptId}/grade`)
      .set(auth(staffToken))
      .send({ answers: [{ attemptQuestionId: essay.id, points: 5, feedback: 'إجابة جيدة' }] })
      .expect(200);
    const gradedBody = graded.body as AttemptBody;
    expect(gradedBody.data.attempt.status).toBe('GRADED');
    expect(gradedBody.data.attempt.score).toBe('9');
    expect(
      await database.notification.count({
        where: {
          userId: studentUserId,
          type: 'QUIZ_GRADED',
          data: { path: ['attemptId'], equals: mixedAttemptId },
        },
      }),
    ).toBe(1);
    const studentResult = await request(app)
      .get(`/api/v1/attempts/${mixedAttemptId}`)
      .set(auth(studentToken))
      .expect(200);
    expect((studentResult.body as AttemptBody).data.attempt.score).toBe('9');
    expect(JSON.stringify(studentResult.body)).not.toContain('isCorrect');
  });
});
