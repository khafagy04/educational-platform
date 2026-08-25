import type { Request, Response } from 'express';
import type { GradesService } from './grades.service.js';
import type { CreateGradeInput, UpdateGradeInput } from './grades.validators.js';

export class GradesController {
  public constructor(private readonly service: GradesService) {}

  public list = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: { grades: await this.service.list() } });
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { grade: await this.service.get(this.id(request)) } });
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const grade = await this.service.create(request.validated.body as CreateGradeInput);
    response.status(201).json({ data: { grade } });
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const grade = await this.service.update(
      this.id(request),
      request.validated.body as UpdateGradeInput,
    );
    response.json({ data: { grade } });
  };

  public delete = async (request: Request, response: Response): Promise<void> => {
    await this.service.delete(this.id(request));
    response.status(204).send();
  };

  private id(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }
}
