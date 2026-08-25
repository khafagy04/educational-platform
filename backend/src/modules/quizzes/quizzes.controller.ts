import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/application-error.js';
import type { QuizzesService } from './quizzes.service.js';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  GradeAttemptInput,
  GradingQueueInput,
  SubmitAttemptInput,
  UpdateQuizInput,
} from './quizzes.validators.js';

export class QuizzesController {
  public constructor(private readonly service: QuizzesService) {}

  public createQuiz = async (request: Request, response: Response): Promise<void> => {
    response.status(201).json({
      data: { quiz: await this.service.createQuiz(request.validated.body as CreateQuizInput) },
    });
  };
  public getQuizAdmin = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { quiz: await this.service.getQuizAdmin(this.id(request)) } });
  };
  public updateQuiz = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: {
        quiz: await this.service.updateQuiz(
          this.id(request),
          request.validated.body as UpdateQuizInput,
        ),
      },
    });
  };
  public deleteQuiz = async (request: Request, response: Response): Promise<void> => {
    await this.service.deleteQuiz(this.id(request));
    response.status(204).send();
  };
  public createQuestion = async (request: Request, response: Response): Promise<void> => {
    const quizId = (request.validated.params as { quizId: string }).quizId;
    response.status(201).json({
      data: {
        question: await this.service.createQuestion(
          quizId,
          request.validated.body as CreateQuestionInput,
        ),
      },
    });
  };
  public updateQuestion = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: {
        question: await this.service.updateQuestion(
          this.id(request),
          request.validated.body as CreateQuestionInput,
        ),
      },
    });
  };
  public deleteQuestion = async (request: Request, response: Response): Promise<void> => {
    await this.service.deleteQuestion(this.id(request));
    response.status(204).send();
  };
  public startAttempt = async (request: Request, response: Response): Promise<void> => {
    response.status(201).json({
      data: { attempt: await this.service.startAttempt(this.userId(request), this.id(request)) },
    });
  };
  public submitAttempt = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: {
        attempt: await this.service.submitAttempt(
          this.userId(request),
          this.id(request),
          request.validated.body as SubmitAttemptInput,
        ),
      },
    });
  };
  public getAttempt = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: { attempt: await this.service.getAttempt(this.userId(request), this.id(request)) },
    });
  };
  public gradingQueue = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: await this.service.gradingQueue(request.validated.query as GradingQueueInput),
    });
  };
  public gradeAttempt = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: {
        attempt: await this.service.gradeAttempt(
          this.userId(request),
          this.id(request),
          request.validated.body as GradeAttemptInput,
        ),
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
