import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/application-error.js';
import type { ProgressService } from './progress.service.js';
import type { UpdateProgressInput } from './progress.validators.js';

export class ProgressController {
  public constructor(private readonly service: ProgressService) {}

  public update = async (request: Request, response: Response): Promise<void> => {
    const progress = await this.service.update(
      this.userId(request),
      this.id(request),
      request.validated.body as UpdateProgressInput,
    );
    response.json({ data: { progress } });
  };

  public course = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: { progress: await this.service.getCourse(this.userId(request), this.id(request)) },
    });
  };

  public dashboard = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: await this.service.dashboard(this.userId(request)) });
  };

  private userId(request: Request): string {
    if (!request.user) throw new UnauthorizedError();
    return request.user.id;
  }

  private id(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }
}
