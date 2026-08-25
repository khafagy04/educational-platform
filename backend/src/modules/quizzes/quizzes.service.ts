import { Service } from '../../core/service.js';
import { ConflictError } from '../../errors/application-error.js';
import { QuizStatus } from '../../generated/prisma/enums.js';
import type { QuizzesRepositoryPort } from './quizzes.repository.js';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  GradeAttemptInput,
  GradingQueueInput,
  SubmitAttemptInput,
  UpdateQuizInput,
} from './quizzes.validators.js';

export class QuizzesService extends Service<QuizzesRepositoryPort> {
  public constructor(repository: QuizzesRepositoryPort) {
    super(repository);
  }

  public createQuiz(input: CreateQuizInput): Promise<unknown> {
    if (input.status === QuizStatus.PUBLISHED) {
      throw new ConflictError('أنشئ سؤالاً واحداً على الأقل قبل نشر الاختبار');
    }
    return this.repository.createQuiz(input);
  }

  public getQuizAdmin(id: string): Promise<unknown> {
    return this.repository.getQuizAdmin(id);
  }

  public async updateQuiz(id: string, input: UpdateQuizInput): Promise<unknown> {
    if (input.status === QuizStatus.PUBLISHED && (await this.repository.questionCount(id)) === 0) {
      throw new ConflictError('لا يمكن نشر اختبار بلا أسئلة');
    }
    return this.repository.updateQuiz(id, input);
  }

  public deleteQuiz(id: string): Promise<void> {
    return this.repository.deleteQuiz(id);
  }

  public createQuestion(quizId: string, input: CreateQuestionInput): Promise<unknown> {
    return this.repository.createQuestion(quizId, input);
  }

  public updateQuestion(id: string, input: CreateQuestionInput): Promise<unknown> {
    return this.repository.updateQuestion(id, input);
  }

  public deleteQuestion(id: string): Promise<void> {
    return this.repository.deleteQuestion(id);
  }

  public startAttempt(userId: string, quizId: string): Promise<unknown> {
    return this.repository.startAttempt(userId, quizId);
  }

  public submitAttempt(
    userId: string,
    attemptId: string,
    input: SubmitAttemptInput,
  ): Promise<unknown> {
    return this.repository.submitAttempt(userId, attemptId, input);
  }

  public getAttempt(userId: string, attemptId: string): Promise<unknown> {
    return this.repository.getAttempt(userId, attemptId);
  }

  public gradingQueue(input: GradingQueueInput): Promise<unknown> {
    return this.repository.gradingQueue(input);
  }

  public gradeAttempt(
    graderId: string,
    attemptId: string,
    input: GradeAttemptInput,
  ): Promise<unknown> {
    return this.repository.gradeAttempt(graderId, attemptId, input);
  }
}
