import { Service } from '../../core/service.js';
import type { CourseCompletedEvent } from '../../integrations/events/domain-event.publisher.js';
import type { StorageProvider } from '../../integrations/storage/storage.provider.js';
import { env } from '../../config/env.js';
import { renderCertificatePdf } from './certificate.pdf.js';
import type { CertificatesRepositoryPort } from './certificates.repository.js';

export class CertificatesService extends Service<CertificatesRepositoryPort> {
  public constructor(
    repository: CertificatesRepositoryPort,
    private readonly storage: StorageProvider,
  ) {
    super(repository);
  }

  public async issue(event: CourseCompletedEvent): Promise<void> {
    const existing = await this.repository.findByEnrollment(event.enrollmentId);
    if (existing?.status === 'GENERATED') return;
    const source = await this.repository.getSource(event.enrollmentId);
    const issuedAt = new Date();
    const certificateNumber = `EDU-${String(issuedAt.getUTCFullYear())}-${event.enrollmentId.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    const certificate =
      existing ?? (await this.repository.createPending(source, certificateNumber));
    const fileKey = `certificates/${certificateNumber.toLowerCase()}.pdf`;
    try {
      const verificationUrl = `${env.APP_URL}/certificates/${encodeURIComponent(certificateNumber)}`;
      const pdf = await renderCertificatePdf({
        ...source,
        certificateNumber,
        issuedAt,
        verificationUrl,
      });
      await this.storage.upload({ key: fileKey, body: pdf, mimeType: 'application/pdf' });
      await this.repository.markGenerated(certificate.id, fileKey, issuedAt);
    } catch (error) {
      await this.repository.markFailed(
        certificate.id,
        error instanceof Error ? error.message : 'Unknown generation failure',
      );
      throw error;
    }
  }

  public async verify(certificateNumber: string): Promise<unknown> {
    const certificate = (await this.repository.verify(certificateNumber)) as {
      certificateNumber: string;
      issuedAt: Date | null;
      user: { name: string };
      course: { title: string };
    };
    return {
      valid: true,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      studentName: this.maskName(certificate.user.name),
      courseTitle: certificate.course.title,
    };
  }

  public async download(userId: string, id: string): Promise<unknown> {
    const certificate = await this.repository.ownerDownload(userId, id);
    const expiresInSeconds = 300;
    return {
      url: await this.storage.createSignedDownloadUrl(certificate.fileKey, expiresInSeconds),
      expiresInSeconds,
      certificateNumber: certificate.certificateNumber,
    };
  }

  public readSignedDownload(token: string) {
    return this.storage.readSignedDownload(token);
  }

  private maskName(name: string): string {
    return name
      .split(/\s+/u)
      .filter(Boolean)
      .map((part) => `${part.slice(0, 1)}***`)
      .join(' ');
  }
}
