import type { Request, Response } from 'express';
import type { LessonsService } from './lessons.service.js';
import type {
  CreateLessonInput,
  ReorderLessonsInput,
  UpdateLessonInput,
} from './lessons.validators.js';

export class LessonsController {
  public constructor(private readonly service: LessonsService) {}
  public list = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { lessons: await this.service.list(this.moduleId(request)) } });
  };
  public create = async (request: Request, response: Response): Promise<void> => {
    const lesson = await this.service.create(
      this.moduleId(request),
      request.validated.body as CreateLessonInput,
    );
    response.status(201).json({ data: { lesson } });
  };
  public update = async (request: Request, response: Response): Promise<void> => {
    const lesson = await this.service.update(
      this.id(request),
      request.validated.body as UpdateLessonInput,
    );
    response.json({ data: { lesson } });
  };
  public reorder = async (request: Request, response: Response): Promise<void> => {
    await this.service.reorder(
      this.moduleId(request),
      request.validated.body as ReorderLessonsInput,
    );
    response.json({ data: { reordered: true } });
  };
  public delete = async (request: Request, response: Response): Promise<void> => {
    await this.service.delete(this.id(request));
    response.status(204).send();
  };
  private id(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }
  private moduleId(request: Request): string {
    return (request.validated.params as { moduleId: string }).moduleId;
  }
}
