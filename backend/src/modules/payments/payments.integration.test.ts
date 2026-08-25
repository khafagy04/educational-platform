import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import {
  CourseStatus,
  EnrollmentStatus,
  LessonType,
  UserRole,
  VideoProvider as VideoProviderName,
  VideoStatus,
} from '../../generated/prisma/enums.js';
import {
  LocalFawaterkProvider,
  signFawaterkWebhook,
  type FawaterkProvider,
  type FawaterkWebhook,
  type InitiatePaymentInput,
  type PaymentSession,
} from '../../integrations/fawaterk/fawaterk.provider.js';
import { expireEnrollments } from '../../jobs/enrollment-expiry.job.js';
import { database } from '../../lib/database.js';
import { tokenService } from '../../middleware/auth.js';

const vendorKey = 'phase-7-test-vendor-key-which-is-secret';

class FakeFawaterkProvider implements FawaterkProvider {
  private readonly verifier = new LocalFawaterkProvider(vendorKey);
  private sessionNumber = 0;

  public async initiatePayment(_input: InitiatePaymentInput): Promise<PaymentSession> {
    void _input;
    this.sessionNumber += 1;
    await Promise.resolve();
    return {
      checkoutUrl: `https://checkout.example.invalid/session-${String(this.sessionNumber)}`,
      invoiceId: `invoice-${String(this.sessionNumber)}`,
      invoiceKey: `invoice-key-${String(this.sessionNumber)}`,
    };
  }

  public verifyWebhook(payload: FawaterkWebhook) {
    return this.verifier.verifyWebhook(payload);
  }
}

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const email = 'phase-7-student@example.local';
const coursePrefix = 'phase-7-payment-course-';
const provider = new FakeFawaterkProvider();
const app = createApp({ fawaterkProvider: provider });
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
let token = '';
let userId = '';
let walletCourseId = '';
let directCourseId = '';
let insufficientCourseId = '';
let directLessonId = '';
let walletOrderId = '';
let directOrderId = '';

const paidWebhook = (number: number): FawaterkWebhook => {
  const unsigned = {
    invoice_key: `invoice-key-${String(number)}`,
    invoice_id: `invoice-${String(number)}`,
    payment_method: 'Card',
    invoice_status: 'paid',
    pay_load: null,
    referenceNumber: `reference-${String(number)}`,
  };
  return { ...unsigned, hashKey: signFawaterkWebhook(unsigned, vendorKey) };
};

describe.skipIf(!runDatabaseTests)('Phase 7 wallet and payment lifecycle', () => {
  beforeAll(async () => {
    const staleCourses = await database.course.findMany({
      where: { slug: { startsWith: coursePrefix } },
      select: { id: true },
    });
    const staleCourseIds = staleCourses.map(({ id }) => id);
    if (staleCourseIds.length > 0) {
      await database.paymentWebhookEvent.deleteMany({
        where: { providerEventId: { startsWith: 'invoice-' } },
      });
      await database.enrollment.deleteMany({ where: { courseId: { in: staleCourseIds } } });
      await database.payment.deleteMany({ where: { order: { courseId: { in: staleCourseIds } } } });
      await database.walletTransaction.deleteMany({
        where: { order: { courseId: { in: staleCourseIds } } },
      });
      await database.order.deleteMany({ where: { courseId: { in: staleCourseIds } } });
      await database.course.deleteMany({ where: { id: { in: staleCourseIds } } });
    }
    await database.user.deleteMany({ where: { email } });

    const [instructor, subject] = await Promise.all([
      database.user.findFirstOrThrow({ where: { role: UserRole.INSTRUCTOR } }),
      database.subject.findFirstOrThrow(),
    ]);
    const user = await database.user.create({
      data: {
        name: 'طالب مدفوعات المرحلة السابعة',
        email,
        passwordHash: 'not-used-by-api-token-tests',
        role: UserRole.STUDENT,
        emailVerifiedAt: new Date(),
        wallet: { create: { balance: '150.00' } },
      },
    });
    userId = user.id;
    token = tokenService.createAccessToken(user.id, user.role);
    const courseData = (suffix: string, title: string, price: string) => ({
      gradeId: subject.gradeId,
      subjectId: subject.id,
      createdById: instructor.id,
      title,
      slug: `${coursePrefix}${suffix}`,
      description: `مساق اختبار ${title} للتحقق من ذرية الدفع والاشتراك.`,
      price,
      accessDurationDays: 30,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    });
    const [walletCourse, directCourse, insufficientCourse] = await Promise.all([
      database.course.create({ data: courseData('wallet', 'الدفع بالمحفظة', '100.00') }),
      database.course.create({ data: courseData('direct', 'الدفع المباشر', '125.00') }),
      database.course.create({ data: courseData('insufficient', 'الرصيد غير الكافي', '300.00') }),
    ]);
    walletCourseId = walletCourse.id;
    directCourseId = directCourse.id;
    insufficientCourseId = insufficientCourse.id;
    const module = await database.courseModule.create({
      data: { courseId: directCourseId, title: 'وحدة الدفع المباشر', sortOrder: 1 },
    });
    const lesson = await database.lesson.create({
      data: {
        moduleId: module.id,
        title: 'فيديو اشتراك منتهي',
        slug: 'expired-enrollment-video',
        type: LessonType.VIDEO,
        sortOrder: 1,
        video: {
          create: {
            provider: VideoProviderName.CLOUDFLARE_STREAM,
            providerVideoId: 'phase-7-video-private-id',
            status: VideoStatus.READY,
          },
        },
      },
    });
    directLessonId = lesson.id;
  });

  afterAll(async () => {
    await database.paymentWebhookEvent.deleteMany({
      where: { providerEventId: { startsWith: 'invoice-' } },
    });
    await database.enrollment.deleteMany({ where: { userId } });
    await database.walletTransaction.deleteMany({ where: { wallet: { userId } } });
    await database.payment.deleteMany({ where: { userId } });
    await database.order.deleteMany({ where: { userId } });
    await database.course.deleteMany({ where: { slug: { startsWith: coursePrefix } } });
    await database.user.deleteMany({ where: { email } });
    await database.$disconnect();
  });

  it('keeps a top-up pending until a valid, idempotent webhook credits it once', async () => {
    const topup = await request(app)
      .post('/api/v1/wallet/topup')
      .set(auth(token))
      .set('idempotency-key', 'phase7-topup-001')
      .send({ amount: 200 })
      .expect(201);
    expect(JSON.stringify(topup.body)).toContain('session-1');
    const before = await request(app).get('/api/v1/wallet').set(auth(token)).expect(200);
    const beforeBody = before.body as unknown as { data: { wallet: { balance: string } } };
    expect(beforeBody.data.wallet.balance).toBe('150');

    await request(app)
      .post('/api/v1/webhooks/fawaterk')
      .send({ ...paidWebhook(1), hashKey: '0'.repeat(64) })
      .expect(401);
    await request(app).post('/api/v1/webhooks/fawaterk').send(paidWebhook(1)).expect(200);
    await request(app).post('/api/v1/webhooks/fawaterk').send(paidWebhook(1)).expect(200);
    const after = await request(app).get('/api/v1/wallet').set(auth(token)).expect(200);
    const afterBody = after.body as unknown as { data: { wallet: { balance: string } } };
    expect(afterBody.data.wallet.balance).toBe('350');
  });

  it('atomically pays from the wallet, enrolls, and rejects insufficient balance', async () => {
    const walletOrder = await request(app)
      .post('/api/v1/orders')
      .set(auth(token))
      .set('idempotency-key', 'phase7-wallet-order')
      .send({ courseId: walletCourseId })
      .expect(201);
    const walletOrderBody = walletOrder.body as unknown as { data: { order: { id: string } } };
    walletOrderId = walletOrderBody.data.order.id;
    await request(app)
      .post(`/api/v1/orders/${walletOrderId}/pay`)
      .set(auth(token))
      .send({ method: 'WALLET' })
      .expect(200);
    const enrollment = await database.enrollment.findFirst({
      where: { userId, courseId: walletCourseId, status: EnrollmentStatus.ACTIVE },
    });
    expect(enrollment).not.toBeNull();

    const insufficientOrder = await request(app)
      .post('/api/v1/orders')
      .set(auth(token))
      .set('idempotency-key', 'phase7-insufficient-order')
      .send({ courseId: insufficientCourseId })
      .expect(201);
    const insufficientOrderBody = insufficientOrder.body as unknown as {
      data: { order: { id: string } };
    };
    await request(app)
      .post(`/api/v1/orders/${insufficientOrderBody.data.order.id}/pay`)
      .set(auth(token))
      .send({ method: 'WALLET' })
      .expect(409);
  });

  it('creates direct enrollment only after the provider webhook and blocks double purchase', async () => {
    const directOrder = await request(app)
      .post('/api/v1/orders')
      .set(auth(token))
      .set('idempotency-key', 'phase7-direct-order')
      .send({ courseId: directCourseId })
      .expect(201);
    const directOrderBody = directOrder.body as unknown as { data: { order: { id: string } } };
    directOrderId = directOrderBody.data.order.id;
    const payment = await request(app)
      .post(`/api/v1/orders/${directOrderId}/pay`)
      .set(auth(token))
      .send({ method: 'FAWATERK' })
      .expect(200);
    expect(JSON.stringify(payment.body)).toContain('session-2');
    expect(await database.enrollment.count({ where: { orderId: directOrderId } })).toBe(0);

    await request(app).post('/api/v1/webhooks/fawaterk_json').send(paidWebhook(2)).expect(200);
    expect(await database.enrollment.count({ where: { orderId: directOrderId } })).toBe(1);
    await request(app)
      .post('/api/v1/orders')
      .set(auth(token))
      .set('idempotency-key', 'phase7-double-purchase')
      .send({ courseId: directCourseId })
      .expect(409);
  });

  it('expires elapsed enrollments and the Phase 6 video guard rejects playback', async () => {
    await database.enrollment.update({
      where: { orderId: directOrderId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    expect(await expireEnrollments()).toBeGreaterThanOrEqual(1);
    const enrollment = await database.enrollment.findUniqueOrThrow({
      where: { orderId: directOrderId },
    });
    expect(enrollment.status).toBe(EnrollmentStatus.EXPIRED);
    await request(app)
      .get(`/api/v1/lessons/${directLessonId}/video-token`)
      .set(auth(token))
      .expect(403);
  });

  it('lists only the authenticated student wallet transactions', async () => {
    const response = await request(app)
      .get('/api/v1/wallet/transactions?page=1&pageSize=20')
      .set(auth(token))
      .expect(200);
    const responseBody = response.body as unknown as { data: { total: number } };
    expect(responseBody.data.total).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(response.body)).not.toContain('providerReference');
  });
});
