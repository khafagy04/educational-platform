import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/application-error.js';
import type { StudentService } from './student.service.js';
import type {
  ChangePasswordInput,
  NotificationPreferencesInput,
  StudentCourseQuery,
  UpdateProfileInput,
} from './student.validators.js';

export class StudentController {
  public constructor(private readonly service: StudentService) {}
  private userId(request: Request) {
    if (!request.user) throw new UnauthorizedError();
    return request.user.id;
  }
  private courseId(request: Request) {
    return (request.validated.params as { id: string }).id;
  }
  public courses = async (request: Request, response: Response) =>
    response.json({
      data: await this.service.courses(
        this.userId(request),
        request.validated.query as StudentCourseQuery,
      ),
    });
  public player = async (request: Request, response: Response) =>
    response.json({
      data: await this.service.player(this.userId(request), this.courseId(request)),
    });
  public certificates = async (request: Request, response: Response) =>
    response.json({ data: await this.service.certificates(this.userId(request)) });
  public profile = async (request: Request, response: Response) =>
    response.json({ data: { profile: await this.service.profile(this.userId(request)) } });
  public updateProfile = async (request: Request, response: Response) =>
    response.json({
      data: {
        profile: await this.service.updateProfile(
          this.userId(request),
          request.validated.body as UpdateProfileInput,
        ),
      },
    });
  public changePassword = async (request: Request, response: Response) =>
    response.json({
      data: await this.service.changePassword(
        this.userId(request),
        request.validated.body as ChangePasswordInput,
      ),
    });
  public preferences = async (request: Request, response: Response) =>
    response.json({ data: { preferences: await this.service.preferences(this.userId(request)) } });
  public updatePreferences = async (request: Request, response: Response) =>
    response.json({
      data: {
        preferences: await this.service.updatePreferences(
          this.userId(request),
          request.validated.body as NotificationPreferencesInput,
        ),
      },
    });
  public addFavorite = async (request: Request, response: Response) =>
    response.json({
      data: await this.service.favorite(this.userId(request), this.courseId(request), true),
    });
  public removeFavorite = async (request: Request, response: Response) =>
    response.json({
      data: await this.service.favorite(this.userId(request), this.courseId(request), false),
    });
}
