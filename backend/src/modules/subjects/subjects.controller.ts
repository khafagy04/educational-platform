import type { Request, Response } from 'express';
import type { SubjectsService } from './subjects.service.js';
import type { CreateSubjectInput, UpdateSubjectInput } from './subjects.validators.js';

export class SubjectsController {
  public constructor(private readonly service: SubjectsService) {}
  public list = async (request: Request, response: Response): Promise<void> => {
    const { gradeId } = request.validated.query as { gradeId?: string };
    response.json({ data: { subjects: await this.service.list(gradeId) } });
  };
  public get = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { subject: await this.service.get(this.id(request)) } });
  };
  public create = async (request: Request, response: Response): Promise<void> => {
    const subject = await this.service.create(request.validated.body as CreateSubjectInput);
    response.status(201).json({ data: { subject } });
  };
  public update = async (request: Request, response: Response): Promise<void> => {
    const subject = await this.service.update(
      this.id(request),
      request.validated.body as UpdateSubjectInput,
    );
    response.json({ data: { subject } });
  };
  public delete = async (request: Request, response: Response): Promise<void> => {
    await this.service.delete(this.id(request));
    response.status(204).send();
  };
  private id(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }
}
