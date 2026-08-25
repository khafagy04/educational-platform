import { Repository } from '../../core/repository.js';
import { ConflictError, NotFoundError } from '../../errors/application-error.js';
import {
  CertificateStatus,
  EnrollmentStatus,
  NotificationType,
} from '../../generated/prisma/enums.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

export type CertificateSource = {
  enrollmentId: string;
  userId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
};

export type CertificatesRepositoryPort = {
  findByEnrollment(enrollmentId: string): Promise<{ id: string; status: CertificateStatus } | null>;
  getSource(enrollmentId: string): Promise<CertificateSource>;
  createPending(source: CertificateSource, certificateNumber: string): Promise<{ id: string }>;
  markGenerated(id: string, fileKey: string, issuedAt: Date): Promise<void>;
  markFailed(id: string, reason: string): Promise<void>;
  verify(certificateNumber: string): Promise<unknown>;
  ownerDownload(
    userId: string,
    id: string,
  ): Promise<{ fileKey: string; certificateNumber: string }>;
};

export class CertificatesRepository
  extends Repository<PrismaClient>
  implements CertificatesRepositoryPort
{
  public constructor(client: PrismaClient) {
    super(client);
  }

  public findByEnrollment(enrollmentId: string) {
    return this.client.certificate.findUnique({
      where: { enrollmentId },
      select: { id: true, status: true },
    });
  }

  public async getSource(enrollmentId: string): Promise<CertificateSource> {
    const enrollment = await this.client.enrollment.findFirst({
      where: { id: enrollmentId, status: EnrollmentStatus.COMPLETED },
      select: {
        id: true,
        userId: true,
        courseId: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });
    if (!enrollment) throw new ConflictError('الاشتراك لم يكتمل بعد');
    return {
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      studentName: enrollment.user.name,
      courseTitle: enrollment.course.title,
    };
  }

  public async createPending(
    source: CertificateSource,
    certificateNumber: string,
  ): Promise<{ id: string }> {
    try {
      return await this.client.certificate.create({
        data: {
          enrollmentId: source.enrollmentId,
          userId: source.userId,
          courseId: source.courseId,
          certificateNumber,
        },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.client.certificate.findUniqueOrThrow({
          where: { enrollmentId: source.enrollmentId },
          select: { id: true },
        });
        return existing;
      }
      throw error;
    }
  }

  public async markGenerated(id: string, fileKey: string, issuedAt: Date): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      const certificate = await transaction.certificate.update({
        where: { id },
        data: { status: CertificateStatus.GENERATED, fileKey, issuedAt, failureReason: null },
      });
      await transaction.notification.create({
        data: {
          userId: certificate.userId,
          type: NotificationType.CERTIFICATE_ISSUED,
          title: 'صدرت شهادتك',
          body: 'شهادة إتمام المساق جاهزة للتنزيل.',
          data: { certificateId: certificate.id, courseId: certificate.courseId },
        },
      });
    });
  }
  public async markFailed(id: string, reason: string): Promise<void> {
    await this.client.certificate.update({
      where: { id },
      data: { status: CertificateStatus.FAILED, failureReason: reason.slice(0, 2000) },
    });
  }
  public async verify(certificateNumber: string): Promise<unknown> {
    const certificate = await this.client.certificate.findFirst({
      where: { certificateNumber, status: CertificateStatus.GENERATED },
      select: {
        certificateNumber: true,
        issuedAt: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });
    if (!certificate) throw new NotFoundError('الشهادة غير موجودة أو غير صالحة');
    return certificate;
  }
  public async ownerDownload(
    userId: string,
    id: string,
  ): Promise<{ fileKey: string; certificateNumber: string }> {
    const certificate = await this.client.certificate.findFirst({
      where: { id, userId, status: CertificateStatus.GENERATED },
      select: { fileKey: true, certificateNumber: true },
    });
    if (!certificate?.fileKey) throw new NotFoundError('الشهادة غير موجودة أو لم تجهز بعد');
    return { fileKey: certificate.fileKey, certificateNumber: certificate.certificateNumber };
  }
}
