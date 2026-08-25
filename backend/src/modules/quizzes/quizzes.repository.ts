import { Repository } from '../../core/repository.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../errors/application-error.js';
import {
  EnrollmentStatus,
  NotificationType,
  QuestionType,
  QuizAttemptStatus,
  QuizStatus,
} from '../../generated/prisma/enums.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  GradeAttemptInput,
  GradingQueueInput,
  SubmitAttemptInput,
  UpdateQuizInput,
} from './quizzes.validators.js';

const studentAttemptSelect = {
  id: true,
  quizId: true,
  attemptNumber: true,
  status: true,
  score: true,
  maxScore: true,
  startedAt: true,
  expiresAt: true,
  submittedAt: true,
  gradedAt: true,
  attemptQuestions: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      type: true,
      promptSnapshot: true,
      pointsSnapshot: true,
      sortOrder: true,
      options: {
        orderBy: { sortOrder: 'asc' as const },
        select: { id: true, textSnapshot: true, sortOrder: true },
      },
      answer: {
        select: {
          selectedOptionId: true,
          essayText: true,
          instructorFeedback: true,
          gradedAt: true,
        },
      },
    },
  },
} satisfies Prisma.QuizAttemptSelect;

const adminAttemptSelect = {
  ...studentAttemptSelect,
  attemptQuestions: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      type: true,
      promptSnapshot: true,
      pointsSnapshot: true,
      sortOrder: true,
      options: {
        orderBy: { sortOrder: 'asc' as const },
        select: { id: true, textSnapshot: true, sortOrder: true },
      },
      answer: {
        select: {
          selectedOptionId: true,
          essayText: true,
          autoAwardedPoints: true,
          manualAwardedPoints: true,
          instructorFeedback: true,
          gradedAt: true,
        },
      },
    },
  },
} satisfies Prisma.QuizAttemptSelect;

export type QuizzesRepositoryPort = {
  createQuiz(input: CreateQuizInput): Promise<unknown>;
  getQuizAdmin(id: string): Promise<unknown>;
  updateQuiz(id: string, input: UpdateQuizInput): Promise<unknown>;
  deleteQuiz(id: string): Promise<void>;
  createQuestion(quizId: string, input: CreateQuestionInput): Promise<unknown>;
  updateQuestion(id: string, input: CreateQuestionInput): Promise<unknown>;
  deleteQuestion(id: string): Promise<void>;
  startAttempt(userId: string, quizId: string): Promise<unknown>;
  submitAttempt(userId: string, attemptId: string, input: SubmitAttemptInput): Promise<unknown>;
  getAttempt(userId: string, attemptId: string): Promise<unknown>;
  gradingQueue(input: GradingQueueInput): Promise<unknown>;
  gradeAttempt(graderId: string, attemptId: string, input: GradeAttemptInput): Promise<unknown>;
  questionCount(quizId: string): Promise<number>;
};

export class QuizzesRepository extends Repository<PrismaClient> implements QuizzesRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public async createQuiz(input: CreateQuizInput): Promise<unknown> {
    await this.assertTargets(input.moduleId, input.lessonId);
    try {
      return await this.client.quiz.create({
        data: {
          moduleId: input.moduleId ?? null,
          lessonId: input.lessonId ?? null,
          title: input.title,
          description: input.description ?? null,
          timeLimitSec: input.timeLimitSec ?? null,
          passingScore: new Prisma.Decimal(input.passingScore),
          maxAttempts: input.maxAttempts,
          status: input.status,
        },
      });
    } catch (error) {
      this.translate(error);
    }
  }

  public async getQuizAdmin(id: string): Promise<unknown> {
    const quiz = await this.client.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!quiz) throw new NotFoundError('الاختبار غير موجود');
    return quiz;
  }

  public async updateQuiz(id: string, input: UpdateQuizInput): Promise<unknown> {
    const current = await this.client.quiz.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('الاختبار غير موجود');
    const moduleId = input.moduleId !== undefined ? input.moduleId : current.moduleId;
    const lessonId = input.lessonId !== undefined ? input.lessonId : current.lessonId;
    await this.assertTargets(moduleId, lessonId);
    try {
      return await this.client.quiz.update({
        where: { id },
        data: {
          ...(input.moduleId !== undefined ? { moduleId: input.moduleId } : {}),
          ...(input.lessonId !== undefined ? { lessonId: input.lessonId } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.timeLimitSec !== undefined ? { timeLimitSec: input.timeLimitSec } : {}),
          ...(input.passingScore !== undefined
            ? { passingScore: new Prisma.Decimal(input.passingScore) }
            : {}),
          ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
    } catch (error) {
      this.translate(error);
    }
  }

  public async deleteQuiz(id: string): Promise<void> {
    try {
      await this.client.quiz.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003')
        throw new ConflictError('لا يمكن حذف اختبار له محاولات');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        throw new NotFoundError('الاختبار غير موجود');
      throw error;
    }
  }

  public async createQuestion(quizId: string, input: CreateQuestionInput): Promise<unknown> {
    if ((await this.client.quiz.count({ where: { id: quizId } })) === 0)
      throw new NotFoundError('الاختبار غير موجود');
    try {
      return await this.client.question.create({
        data: {
          quizId,
          type: input.type,
          prompt: input.prompt,
          points: new Prisma.Decimal(input.points),
          sortOrder: input.sortOrder,
          options: { create: input.options.map((option) => ({ ...option })) },
        },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });
    } catch (error) {
      this.translate(error);
    }
  }

  public async updateQuestion(id: string, input: CreateQuestionInput): Promise<unknown> {
    try {
      return await this.client.$transaction(async (transaction) => {
        await transaction.questionOption.deleteMany({ where: { questionId: id } });
        return transaction.question.update({
          where: { id },
          data: {
            type: input.type,
            prompt: input.prompt,
            points: new Prisma.Decimal(input.points),
            sortOrder: input.sortOrder,
            options: { create: input.options.map((option) => ({ ...option })) },
          },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        });
      });
    } catch (error) {
      this.translate(error);
    }
  }

  public async deleteQuestion(id: string): Promise<void> {
    try {
      await this.client.question.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        throw new NotFoundError('السؤال غير موجود');
      throw error;
    }
  }

  public startAttempt(userId: string, quizId: string): Promise<unknown> {
    return this.client.$transaction(
      async (transaction) => {
        const quiz = await transaction.quiz.findFirst({
          where: { id: quizId, status: QuizStatus.PUBLISHED },
          include: {
            module: { select: { courseId: true } },
            lesson: { select: { module: { select: { courseId: true } } } },
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: { options: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        });
        if (!quiz) throw new NotFoundError('الاختبار غير موجود أو غير منشور');
        if (quiz.questions.length === 0) throw new ConflictError('لا يمكن بدء اختبار بلا أسئلة');
        const courseId = quiz.module?.courseId ?? quiz.lesson?.module.courseId;
        if (!courseId) throw new ConflictError('الاختبار غير مرتبط بمساق');
        const enrollment = await transaction.enrollment.findFirst({
          where: {
            userId,
            courseId,
            status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
            startsAt: { lte: new Date() },
            expiresAt: { gt: new Date() },
          },
        });
        if (!enrollment) throw new ForbiddenError('يلزم اشتراك ساري لبدء الاختبار');
        const attempts = await transaction.quizAttempt.count({ where: { userId, quizId } });
        if (attempts >= quiz.maxAttempts)
          throw new ConflictError('تم استنفاد عدد محاولات الاختبار');
        const maxScore = quiz.questions.reduce(
          (sum, question) => sum.plus(question.points),
          new Prisma.Decimal(0),
        );
        const startedAt = new Date();
        const attempt = await transaction.quizAttempt.create({
          data: {
            quizId,
            enrollmentId: enrollment.id,
            userId,
            attemptNumber: attempts + 1,
            maxScore,
            startedAt,
            expiresAt: quiz.timeLimitSec
              ? new Date(startedAt.getTime() + quiz.timeLimitSec * 1000)
              : null,
          },
        });
        for (const question of quiz.questions) {
          await transaction.attemptQuestion.create({
            data: {
              attemptId: attempt.id,
              originalQuestionId: question.id,
              type: question.type,
              promptSnapshot: question.prompt,
              pointsSnapshot: question.points,
              sortOrder: question.sortOrder,
              options: {
                create: question.options.map((option) => ({
                  originalOptionId: option.id,
                  textSnapshot: option.text,
                  isCorrectSnapshot: option.isCorrect,
                  sortOrder: option.sortOrder,
                })),
              },
            },
          });
        }
        return transaction.quizAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
          select: studentAttemptSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  public submitAttempt(
    userId: string,
    attemptId: string,
    input: SubmitAttemptInput,
  ): Promise<unknown> {
    return this.client.$transaction(
      async (transaction) => {
        const attempt = await transaction.quizAttempt.findFirst({
          where: { id: attemptId, userId },
          include: { attemptQuestions: { include: { options: true } } },
        });
        if (!attempt) throw new NotFoundError('المحاولة غير موجودة');
        if (attempt.status !== QuizAttemptStatus.IN_PROGRESS)
          throw new ConflictError('تم إرسال هذه المحاولة بالفعل');
        if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
          await transaction.quizAttempt.update({
            where: { id: attempt.id },
            data: { status: QuizAttemptStatus.EXPIRED },
          });
          throw new ConflictError('انتهى وقت الاختبار');
        }
        if (
          new Set(input.answers.map(({ attemptQuestionId }) => attemptQuestionId)).size !==
            input.answers.length ||
          input.answers.length !== attempt.attemptQuestions.length
        ) {
          throw new ValidationError('يجب إرسال إجابة واحدة لكل سؤال');
        }
        let autoScore = new Prisma.Decimal(0);
        let hasEssay = false;
        for (const question of attempt.attemptQuestions) {
          const answer = input.answers.find(
            ({ attemptQuestionId }) => attemptQuestionId === question.id,
          );
          if (!answer) throw new ValidationError('إجابة السؤال مفقودة');
          if (question.type === QuestionType.MCQ) {
            const selected = question.options.find(({ id }) => id === answer.selectedOptionId);
            if (!selected || answer.essayText !== undefined)
              throw new ValidationError('إجابة الاختيار غير صالحة');
            const awarded = selected.isCorrectSnapshot
              ? question.pointsSnapshot
              : new Prisma.Decimal(0);
            autoScore = autoScore.plus(awarded);
            await transaction.attemptAnswer.create({
              data: {
                attemptQuestionId: question.id,
                selectedOptionId: selected.id,
                autoAwardedPoints: awarded,
              },
            });
          } else {
            if (!answer.essayText || answer.selectedOptionId !== undefined)
              throw new ValidationError('الإجابة المقالية غير صالحة');
            hasEssay = true;
            await transaction.attemptAnswer.create({
              data: { attemptQuestionId: question.id, essayText: answer.essayText },
            });
          }
        }
        const now = new Date();
        await transaction.quizAttempt.update({
          where: { id: attempt.id },
          data: hasEssay
            ? { status: QuizAttemptStatus.PENDING_REVIEW, score: null, submittedAt: now }
            : {
                status: QuizAttemptStatus.GRADED,
                score: autoScore,
                submittedAt: now,
                gradedAt: now,
              },
        });
        const activityDate = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        await transaction.learningActivity.upsert({
          where: { userId_activityDate: { userId, activityDate } },
          create: { userId, activityDate, quizzesSubmitted: 1 },
          update: { quizzesSubmitted: { increment: 1 } },
        });
        return transaction.quizAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
          select: studentAttemptSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  public async getAttempt(userId: string, attemptId: string): Promise<unknown> {
    const attempt = await this.client.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      select: studentAttemptSelect,
    });
    if (!attempt) throw new NotFoundError('المحاولة غير موجودة');
    return attempt;
  }

  public async gradingQueue(input: GradingQueueInput): Promise<unknown> {
    const where = { status: QuizAttemptStatus.PENDING_REVIEW };
    const [attempts, total] = await this.client.$transaction([
      this.client.quizAttempt.findMany({
        where,
        orderBy: { submittedAt: 'asc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          ...adminAttemptSelect,
          user: { select: { id: true, name: true } },
          quiz: { select: { id: true, title: true } },
        },
      }),
      this.client.quizAttempt.count({ where }),
    ]);
    return { attempts, total, page: input.page, pageSize: input.pageSize };
  }

  public gradeAttempt(
    graderId: string,
    attemptId: string,
    input: GradeAttemptInput,
  ): Promise<unknown> {
    return this.client.$transaction(
      async (transaction) => {
        const attempt = await transaction.quizAttempt.findUnique({
          where: { id: attemptId },
          include: { attemptQuestions: { include: { answer: true } } },
        });
        if (!attempt) throw new NotFoundError('المحاولة غير موجودة');
        if (attempt.status !== QuizAttemptStatus.PENDING_REVIEW)
          throw new ConflictError('المحاولة ليست بانتظار المراجعة');
        const essays = attempt.attemptQuestions.filter(({ type }) => type === QuestionType.ESSAY);
        if (
          new Set(input.answers.map(({ attemptQuestionId }) => attemptQuestionId)).size !==
            input.answers.length ||
          input.answers.length !== essays.length
        )
          throw new ValidationError('يجب تقييم كل الأسئلة المقالية مرة واحدة');
        for (const essay of essays) {
          const grade = input.answers.find(
            ({ attemptQuestionId }) => attemptQuestionId === essay.id,
          );
          if (!grade || grade.points > Number(essay.pointsSnapshot))
            throw new ValidationError('درجة السؤال المقالي غير صالحة');
          await transaction.attemptAnswer.update({
            where: { attemptQuestionId: essay.id },
            data: {
              manualAwardedPoints: new Prisma.Decimal(grade.points),
              instructorFeedback: grade.feedback ?? null,
              gradedById: graderId,
              gradedAt: new Date(),
            },
          });
        }
        const answers = await transaction.attemptAnswer.findMany({
          where: { attemptQuestion: { attemptId } },
        });
        const score = answers.reduce(
          (sum, answer) =>
            sum.plus(answer.autoAwardedPoints ?? 0).plus(answer.manualAwardedPoints ?? 0),
          new Prisma.Decimal(0),
        );
        await transaction.quizAttempt.update({
          where: { id: attemptId },
          data: { status: QuizAttemptStatus.GRADED, score, gradedAt: new Date() },
        });
        await transaction.notification.create({
          data: {
            userId: attempt.userId,
            type: NotificationType.QUIZ_GRADED,
            title: 'تم تصحيح الاختبار',
            body: 'أصبحت نتيجة اختبارك متاحة الآن.',
            data: { attemptId, quizId: attempt.quizId },
          },
        });
        return transaction.quizAttempt.findUniqueOrThrow({
          where: { id: attemptId },
          select: adminAttemptSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  public questionCount(quizId: string): Promise<number> {
    return this.client.question.count({ where: { quizId } });
  }

  private async assertTargets(moduleId?: string | null, lessonId?: string | null): Promise<void> {
    if (!moduleId && !lessonId) throw new ValidationError('يجب ربط الاختبار بوحدة أو درس');
    if (moduleId && (await this.client.courseModule.count({ where: { id: moduleId } })) === 0)
      throw new NotFoundError('الوحدة غير موجودة');
    if (lessonId) {
      const lesson = await this.client.lesson.findUnique({
        where: { id: lessonId },
        select: { moduleId: true },
      });
      if (!lesson) throw new NotFoundError('الدرس غير موجود');
      if (moduleId && lesson.moduleId !== moduleId)
        throw new ValidationError('الدرس لا ينتمي إلى الوحدة المحددة');
    }
  }

  private translate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictError('الترتيب أو ارتباط الدرس مستخدم بالفعل');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
      throw new NotFoundError();
    throw error;
  }
}
