import type { Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../../errors/application-error.js';
import type { AttachmentsService } from './attachments.service.js';
import type { AttachmentMetadataInput } from './attachments.validators.js';

export class AttachmentsController {
  public constructor(private readonly service: AttachmentsService) {}
  public list = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { attachments: await this.service.list(this.lessonId(request)) } });
  };
  public upload = async (request: Request, response: Response): Promise<void> => {
    if (!request.file) throw new ValidationError('ملف المرفق مطلوب');
    const attachment = await this.service.upload(
      this.lessonId(request),
      request.validated.body as AttachmentMetadataInput,
      request.file,
    );
    response.status(201).json({ data: { attachment } });
  };
  public delete = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.validated.params as { id: string };
    await this.service.delete(id);
    response.status(204).send();
  };
  public download = async (request: Request, response: Response): Promise<void> => {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.validated.params as { id: string };
    response.json({ data: { download: await this.service.download(id, request.user.id) } });
  };
  private lessonId(request: Request): string {
    return (request.validated.params as { lessonId: string }).lessonId;
  }
}
