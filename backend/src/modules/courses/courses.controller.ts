import type { Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../../errors/application-error.js';
import type { CoursesService } from './courses.service.js';
import type { CreateCourseInput, UpdateCourseInput } from './courses.validators.js';

export class CoursesController {
  public constructor(private readonly service: CoursesService) {}
  public list = async (request: Request, response: Response): Promise<void> => {
    const filters = request.validated.query as {
      gradeId?: string;
      subjectId?: string;
      search: string;
      minPrice?: number;
      maxPrice?: number;
      pricing: 'all' | 'free' | 'paid';
      sort: 'newest' | 'price-asc' | 'price-desc' | 'popularity';
      page: number;
      pageSize: number;
    };
    const result = await this.service.listPublished(filters);
    response.json({ data: { ...result, page: filters.page, pageSize: filters.pageSize } });
  };
  public getPublished = async (request: Request, response: Response): Promise<void> => {
    const { slug } = request.validated.params as { slug: string };
    response.json({ data: { course: await this.service.getPublished(slug) } });
  };
  public getAdmin = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { course: await this.service.getAdmin(this.id(request)) } });
  };
  public create = async (request: Request, response: Response): Promise<void> => {
    if (!request.user) throw new UnauthorizedError();
    const course = await this.service.create(
      request.validated.body as CreateCourseInput,
      request.user.id,
    );
    response.status(201).json({ data: { course } });
  };
  public update = async (request: Request, response: Response): Promise<void> => {
    const course = await this.service.update(
      this.id(request),
      request.validated.body as UpdateCourseInput,
    );
    response.json({ data: { course } });
  };
  public thumbnail = async (request: Request, response: Response): Promise<void> => {
    if (!request.file) throw new ValidationError('ملف صورة الغلاف مطلوب');
    const course = await this.service.uploadThumbnail(this.id(request), request.file);
    response.json({ data: { course } });
  };
  public delete = async (request: Request, response: Response): Promise<void> => {
    await this.service.delete(this.id(request));
    response.status(204).send();
  };
  private id(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }
}
