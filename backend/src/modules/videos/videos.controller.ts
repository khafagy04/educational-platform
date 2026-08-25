import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/application-error.js';
import type { CreateVideoUploadInput } from './videos.validators.js';
import type { VideosService } from './videos.service.js';

export class VideosController {
  public constructor(private readonly service: VideosService) {}

  public createUpload = async (request: Request, response: Response): Promise<void> => {
    const result = await this.service.createUpload(
      this.lessonId(request),
      this.userId(request),
      request.validated.body as CreateVideoUploadInput,
    );
    response.status(201).json({ data: result });
  };

  public playback = async (request: Request, response: Response): Promise<void> => {
    const playback = await this.service.playback(this.lessonId(request), this.userId(request));
    response.json({ data: { playback } });
  };

  public delete = async (request: Request, response: Response): Promise<void> => {
    await this.service.delete(this.lessonId(request));
    response.status(204).send();
  };

  private lessonId(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }

  private userId(request: Request): string {
    if (!request.user) throw new UnauthorizedError();
    return request.user.id;
  }
}
