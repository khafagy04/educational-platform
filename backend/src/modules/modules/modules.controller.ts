import type { Request, Response } from 'express';
import type { ModulesService } from './modules.service.js';
import type {
  CreateModuleInput,
  ReorderModulesInput,
  UpdateModuleInput,
} from './modules.validators.js';

export class ModulesController {
  public constructor(private readonly service: ModulesService) {}
  public list = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { modules: await this.service.list(this.courseId(request)) } });
  };
  public create = async (request: Request, response: Response): Promise<void> => {
    const value = await this.service.create(
      this.courseId(request),
      request.validated.body as CreateModuleInput,
    );
    response.status(201).json({ data: { module: value } });
  };
  public update = async (request: Request, response: Response): Promise<void> => {
    const value = await this.service.update(
      this.id(request),
      request.validated.body as UpdateModuleInput,
    );
    response.json({ data: { module: value } });
  };
  public reorder = async (request: Request, response: Response): Promise<void> => {
    await this.service.reorder(
      this.courseId(request),
      request.validated.body as ReorderModulesInput,
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
  private courseId(request: Request): string {
    return (request.validated.params as { courseId: string }).courseId;
  }
}
