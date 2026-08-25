import type { Request, Response } from 'express';
import type { AdminService } from './admin.service.js';
import type { AdminListQuery, AdminStudentQuery } from './admin.validators.js';
export class AdminController {
  constructor(private readonly service: AdminService) {}
  overview = async (_q: Request, r: Response) => r.json({ data: await this.service.overview() });
  courses = async (q: Request, r: Response) =>
    r.json({ data: await this.service.courses(q.validated.query as AdminListQuery) });
  students = async (q: Request, r: Response) =>
    r.json({ data: await this.service.students(q.validated.query as AdminStudentQuery) });
  student = async (q: Request, r: Response) =>
    r.json({
      data: { student: await this.service.student((q.validated.params as { id: string }).id) },
    });
  settings = async (_q: Request, r: Response) =>
    r.json({ data: { settings: await this.service.settings() } });
  faqs = async (_q: Request, r: Response) => r.json({ data: { faqs: await this.service.faqs() } });
  quizzes = async (q: Request, r: Response) =>
    r.json({
      data: { quizzes: await this.service.quizzes((q.validated.params as { id: string }).id) },
    });
  setStudentStatus = async (q: Request, r: Response) =>
    r.json({
      data: {
        student: await this.service.setStudentStatus(
          (q.validated.params as { id: string }).id,
          (q.validated.body as { status: 'ACTIVE' | 'SUSPENDED' }).status,
        ),
      },
    });
}
