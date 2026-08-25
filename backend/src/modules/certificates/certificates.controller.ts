import type { Request, Response } from 'express';
import { NotFoundError, UnauthorizedError } from '../../errors/application-error.js';
import type { CertificatesService } from './certificates.service.js';

export class CertificatesController {
  public constructor(private readonly service: CertificatesService) {}
  public verify = async (request: Request, response: Response): Promise<void> => {
    const { certificateNumber } = request.validated.params as { certificateNumber: string };
    response.json({ data: { certificate: await this.service.verify(certificateNumber) } });
  };
  public download = async (request: Request, response: Response): Promise<void> => {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.validated.params as { id: string };
    response.json({ data: { download: await this.service.download(request.user.id, id) } });
  };
  public privateFile = async (request: Request, response: Response): Promise<void> => {
    const { token } = request.validated.params as { token: string };
    const file = await this.service.readSignedDownload(token);
    if (!file) throw new NotFoundError('الرابط غير صالح أو منتهي');
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', 'attachment; filename="certificate.pdf"');
    response.send(file.body);
  };
}
