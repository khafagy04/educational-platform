import { createHash } from 'node:crypto';
import { Repository } from '../../core/repository.js';
import { ConflictError, NotFoundError } from '../../errors/application-error.js';
import {
  CourseStatus,
  EnrollmentStatus,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  WalletTransactionStatus,
  WalletTransactionType,
  WebhookEventStatus,
} from '../../generated/prisma/enums.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { VerifiedPaymentEvent } from '../../integrations/fawaterk/fawaterk.provider.js';

export type PaymentCustomerRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export type PaymentsRepositoryPort = {
  findCustomer(userId: string): Promise<PaymentCustomerRecord | null>;
  getWallet(userId: string): Promise<unknown>;
  listTransactions(userId: string, page: number, pageSize: number): Promise<unknown>;
  createTopup(userId: string, amount: string, idempotencyKey: string): Promise<{ id: string }>;
  attachTopupSession(id: string, invoiceKey: string): Promise<void>;
  failTopup(id: string): Promise<void>;
  createOrder(userId: string, courseId: string, idempotencyKey: string): Promise<unknown>;
  payWithWallet(userId: string, orderId: string): Promise<unknown>;
  createPendingProviderPayment(
    userId: string,
    orderId: string,
  ): Promise<{
    id: string;
    amount: Prisma.Decimal;
    currency: string;
    courseTitle: string;
  }>;
  attachPaymentSession(id: string, invoiceId: string, invoiceKey: string): Promise<void>;
  failPayment(id: string): Promise<void>;
  processWebhook(event: VerifiedPaymentEvent): Promise<{ replayed: boolean; kind?: string }>;
  expireEnrollments(now: Date): Promise<number>;
};

export class PaymentsRepository extends Repository<PrismaClient> implements PaymentsRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public findCustomer(userId: string): Promise<PaymentCustomerRecord | null> {
    return this.client.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  public async getWallet(userId: string): Promise<unknown> {
    return this.client.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true, balance: true, currency: true, updatedAt: true },
    });
  }

  public async listTransactions(userId: string, page: number, pageSize: number): Promise<unknown> {
    const where = { wallet: { userId } };
    const [transactions, total] = await this.client.$transaction([
      this.client.walletTransaction.findMany({
        where,
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          currency: true,
          balanceAfter: true,
          description: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.client.walletTransaction.count({ where }),
    ]);
    return { transactions, total, page, pageSize };
  }

  public async createTopup(
    userId: string,
    amount: string,
    idempotencyKey: string,
  ): Promise<{ id: string }> {
    const wallet = await this.client.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    try {
      return await this.client.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.TOP_UP,
          status: WalletTransactionStatus.PENDING,
          amount: new Prisma.Decimal(amount),
          currency: wallet.currency,
          idempotencyKey,
          description: 'شحن المحفظة عبر فواتيرك',
        },
        select: { id: true },
      });
    } catch (error) {
      this.translateIdempotency(error);
    }
  }

  public async attachTopupSession(id: string, invoiceKey: string): Promise<void> {
    await this.client.walletTransaction.update({
      where: { id },
      data: { providerReference: invoiceKey },
    });
  }

  public async failTopup(id: string): Promise<void> {
    await this.client.walletTransaction.updateMany({
      where: { id, status: WalletTransactionStatus.PENDING },
      data: { status: WalletTransactionStatus.FAILED },
    });
  }

  public async createOrder(
    userId: string,
    courseId: string,
    idempotencyKey: string,
  ): Promise<unknown> {
    const course = await this.client.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
    });
    if (!course) throw new NotFoundError('المساق غير موجود أو غير متاح للشراء');
    const active = await this.client.enrollment.count({
      where: {
        userId,
        courseId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
        expiresAt: { gt: new Date() },
      },
    });
    if (active > 0) throw new ConflictError('لديك اشتراك نشط في هذا المساق بالفعل');
    try {
      return await this.client.order.create({
        data: {
          userId,
          courseId,
          amount: course.price,
          currency: course.currency,
          courseTitleSnapshot: course.title,
          idempotencyKey,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    } catch (error) {
      this.translateIdempotency(error);
    }
  }

  public async payWithWallet(userId: string, orderId: string): Promise<unknown> {
    return this.client.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: { id: orderId, userId },
          include: { course: true },
        });
        if (!order) throw new NotFoundError('الطلب غير موجود');
        if (order.status !== OrderStatus.PENDING) {
          throw new ConflictError('الطلب ليس في حالة تسمح بالدفع');
        }
        if (order.expiresAt && order.expiresAt <= new Date()) {
          await transaction.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.EXPIRED },
          });
          throw new ConflictError('انتهت صلاحية الطلب');
        }
        await this.assertNoActiveEnrollment(transaction, userId, order.courseId);
        const deducted = await transaction.wallet.updateMany({
          where: { userId, balance: { gte: order.amount } },
          data: { balance: { decrement: order.amount }, version: { increment: 1 } },
        });
        if (deducted.count !== 1) throw new ConflictError('رصيد المحفظة غير كافٍ');
        const wallet = await transaction.wallet.findUniqueOrThrow({ where: { userId } });
        const payment = await transaction.payment.create({
          data: {
            userId,
            orderId: order.id,
            provider: PaymentProvider.WALLET,
            status: PaymentStatus.PAID,
            amount: order.amount,
            currency: order.currency,
            providerPaymentId: `wallet-${order.id}`,
            paidAt: new Date(),
          },
        });
        await transaction.walletTransaction.create({
          data: {
            walletId: wallet.id,
            orderId: order.id,
            paymentId: payment.id,
            type: WalletTransactionType.COURSE_PURCHASE,
            status: WalletTransactionStatus.COMPLETED,
            amount: order.amount,
            currency: order.currency,
            balanceAfter: wallet.balance,
            idempotencyKey: `wallet-pay:${order.id}`,
            description: `شراء ${order.courseTitleSnapshot}`,
            completedAt: new Date(),
          },
        });
        await transaction.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID, paidAt: new Date() },
        });
        const enrollment = await transaction.enrollment.create({
          data: this.enrollmentData(order, userId),
        });
        await transaction.notification.create({
          data: {
            userId,
            type: NotificationType.PAYMENT_CONFIRMED,
            title: 'تم تأكيد الدفع',
            body: `تم تفعيل اشتراكك في ${order.courseTitleSnapshot}.`,
            data: { orderId: order.id, courseId: order.courseId },
          },
        });
        return { payment, enrollment, wallet };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  public async createPendingProviderPayment(
    userId: string,
    orderId: string,
  ): Promise<{
    id: string;
    amount: Prisma.Decimal;
    currency: string;
    courseTitle: string;
  }> {
    const order = await this.client.order.findFirst({
      where: { id: orderId, userId },
      include: { course: true, payments: true },
    });
    if (!order) throw new NotFoundError('الطلب غير موجود');
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictError('الطلب ليس في حالة تسمح بالدفع');
    }
    if (order.payments.some(({ status }) => status === PaymentStatus.PENDING)) {
      throw new ConflictError('توجد محاولة دفع معلقة لهذا الطلب');
    }
    await this.assertNoActiveEnrollment(this.client, userId, order.courseId);
    const payment = await this.client.payment.create({
      data: {
        userId,
        orderId,
        provider: PaymentProvider.FAWATERK,
        amount: order.amount,
        currency: order.currency,
      },
    });
    return {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      courseTitle: order.courseTitleSnapshot,
    };
  }

  public async attachPaymentSession(
    id: string,
    invoiceId: string,
    invoiceKey: string,
  ): Promise<void> {
    await this.client.payment.update({
      where: { id },
      data: { providerPaymentId: invoiceId, providerSessionId: invoiceKey },
    });
  }

  public async failPayment(id: string): Promise<void> {
    await this.client.payment.updateMany({
      where: { id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED, failureCode: 'PROVIDER_SESSION_FAILED' },
    });
  }

  public async processWebhook(
    event: VerifiedPaymentEvent,
  ): Promise<{ replayed: boolean; kind?: string }> {
    const payloadHash = createHash('sha256').update(JSON.stringify(event.payload)).digest('hex');
    try {
      await this.client.paymentWebhookEvent.create({
        data: {
          provider: PaymentProvider.FAWATERK,
          providerEventId: event.eventId,
          payloadHash,
          eventType: 'invoice.paid',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { replayed: true };
      }
      throw error;
    }

    try {
      const result = await this.client.$transaction(
        async (transaction) => {
          const topup = await transaction.walletTransaction.findUnique({
            where: { providerReference: event.invoiceKey },
          });
          if (topup) {
            const changed = await transaction.walletTransaction.updateMany({
              where: { id: topup.id, status: WalletTransactionStatus.PENDING },
              data: { status: WalletTransactionStatus.COMPLETED, completedAt: new Date() },
            });
            if (changed.count === 1) {
              const wallet = await transaction.wallet.update({
                where: { id: topup.walletId },
                data: { balance: { increment: topup.amount }, version: { increment: 1 } },
              });
              await transaction.walletTransaction.update({
                where: { id: topup.id },
                data: { balanceAfter: wallet.balance },
              });
              await transaction.notification.create({
                data: {
                  userId: wallet.userId,
                  type: NotificationType.PAYMENT_CONFIRMED,
                  title: 'تم شحن المحفظة',
                  body: 'تم تأكيد عملية الشحن وإضافة الرصيد إلى محفظتك.',
                  data: { walletTransactionId: topup.id },
                },
              });
            }
            await transaction.paymentWebhookEvent.update({
              where: {
                provider_providerEventId: {
                  provider: PaymentProvider.FAWATERK,
                  providerEventId: event.eventId,
                },
              },
              data: {
                walletTransactionId: topup.id,
                status: WebhookEventStatus.PROCESSED,
                processedAt: new Date(),
              },
            });
            return { replayed: changed.count === 0, kind: 'wallet_topup' };
          }

          const payment = await transaction.payment.findUnique({
            where: { providerSessionId: event.invoiceKey },
            include: { order: { include: { course: true } } },
          });
          if (!payment?.order) throw new NotFoundError('مرجع الدفع غير معروف');
          const changed = await transaction.payment.updateMany({
            where: { id: payment.id, status: PaymentStatus.PENDING },
            data: {
              status: PaymentStatus.PAID,
              providerPaymentId: event.invoiceId,
              paidAt: new Date(),
            },
          });
          if (changed.count === 1) {
            await transaction.order.update({
              where: { id: payment.order.id },
              data: { status: OrderStatus.PAID, paidAt: new Date() },
            });
            await transaction.enrollment.upsert({
              where: { orderId: payment.order.id },
              create: this.enrollmentData(payment.order, payment.userId),
              update: {
                status: EnrollmentStatus.ACTIVE,
                startsAt: new Date(),
                expiresAt: this.expiryDate(payment.order.course.accessDurationDays),
              },
            });
            await transaction.notification.create({
              data: {
                userId: payment.userId,
                type: NotificationType.PAYMENT_CONFIRMED,
                title: 'تم تأكيد الدفع',
                body: `تم تفعيل اشتراكك في ${payment.order.courseTitleSnapshot}.`,
                data: { orderId: payment.order.id, courseId: payment.order.courseId },
              },
            });
          }
          await transaction.paymentWebhookEvent.update({
            where: {
              provider_providerEventId: {
                provider: PaymentProvider.FAWATERK,
                providerEventId: event.eventId,
              },
            },
            data: {
              paymentId: payment.id,
              status: WebhookEventStatus.PROCESSED,
              processedAt: new Date(),
            },
          });
          return { replayed: changed.count === 0, kind: 'course_purchase' };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return result;
    } catch (error) {
      await this.client.paymentWebhookEvent.update({
        where: {
          provider_providerEventId: {
            provider: PaymentProvider.FAWATERK,
            providerEventId: event.eventId,
          },
        },
        data: { status: WebhookEventStatus.FAILED, failureReason: 'Processing failed' },
      });
      throw error;
    }
  }

  public async expireEnrollments(now: Date): Promise<number> {
    const result = await this.client.enrollment.updateMany({
      where: {
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
        expiresAt: { lte: now },
      },
      data: { status: EnrollmentStatus.EXPIRED },
    });
    return result.count;
  }

  private async assertNoActiveEnrollment(
    client: Prisma.TransactionClient | PrismaClient,
    userId: string,
    courseId: string,
  ): Promise<void> {
    const active = await client.enrollment.count({
      where: {
        userId,
        courseId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
        expiresAt: { gt: new Date() },
      },
    });
    if (active > 0) throw new ConflictError('لديك اشتراك نشط في هذا المساق بالفعل');
  }

  private enrollmentData(
    order: {
      id: string;
      courseId: string;
      amount: Prisma.Decimal;
      currency: string;
      course: { accessDurationDays: number };
    },
    userId: string,
  ) {
    return {
      userId,
      courseId: order.courseId,
      orderId: order.id,
      status: EnrollmentStatus.ACTIVE,
      purchasedPrice: order.amount,
      currency: order.currency,
      startsAt: new Date(),
      expiresAt: this.expiryDate(order.course.accessDurationDays),
    };
  }

  private expiryDate(accessDurationDays: number): Date {
    return new Date(Date.now() + accessDurationDays * 86_400_000);
  }

  private translateIdempotency(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('مفتاح تكرار الطلب مستخدم بالفعل');
    }
    throw error;
  }
}
