import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/application-error.js';
import type { AdminContentService } from './admin-content.service.js';
import type {
  FaqInput,
  ModerationInput,
  NotificationQuery,
  SettingInput,
  TestimonialInput,
  TestimonialQuery,
  UpdateFaqInput,
} from './admin-content.validators.js';

export class AdminContentController {
  public constructor(private readonly service: AdminContentService) {}
  public submitTestimonial = async (request: Request, response: Response): Promise<void> => {
    response.status(201).json({
      data: {
        testimonial: await this.service.submitTestimonial(
          this.userId(request),
          request.validated.body as TestimonialInput,
        ),
      },
    });
  };
  public publicTestimonials = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: { testimonials: await this.service.publicTestimonials() } });
  };
  public adminTestimonials = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: await this.service.adminTestimonials(request.validated.query as TestimonialQuery),
    });
  };
  public moderate = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: {
        testimonial: await this.service.moderate(
          this.userId(request),
          this.id(request),
          request.validated.body as ModerationInput,
        ),
      },
    });
  };
  public createFaq = async (request: Request, response: Response): Promise<void> => {
    response
      .status(201)
      .json({ data: { faq: await this.service.createFaq(request.validated.body as FaqInput) } });
  };
  public updateFaq = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: {
        faq: await this.service.updateFaq(
          this.id(request),
          request.validated.body as UpdateFaqInput,
        ),
      },
    });
  };
  public deleteFaq = async (request: Request, response: Response): Promise<void> => {
    await this.service.deleteFaq(this.id(request));
    response.status(204).send();
  };
  public publicFaqs = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: { faqs: await this.service.publicFaqs() } });
  };
  public setSetting = async (request: Request, response: Response): Promise<void> => {
    const { key } = request.validated.params as { key: string };
    response.json({
      data: {
        setting: await this.service.setSetting(
          this.userId(request),
          key,
          request.validated.body as SettingInput,
        ),
      },
    });
  };
  public publicSettings = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: { settings: await this.service.publicSettings() } });
  };
  public notifications = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: await this.service.notifications(
        this.userId(request),
        request.validated.query as NotificationQuery,
      ),
    });
  };
  public readNotification = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: {
        notification: await this.service.readNotification(this.userId(request), this.id(request)),
      },
    });
  };
  private id(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }
  private userId(request: Request): string {
    if (!request.user) throw new UnauthorizedError();
    return request.user.id;
  }
}
