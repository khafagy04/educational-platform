import { z } from 'zod';
import { QuestionType, QuizStatus } from '../../generated/prisma/enums.js';

export const quizIdParams = z.object({ id: z.uuid() });
export const quizQuestionParams = z.object({ quizId: z.uuid() });
export const questionIdParams = z.object({ id: z.uuid() });
export const attemptIdParams = z.object({ id: z.uuid() });

const quizFields = z.object({
  moduleId: z.uuid().nullable().optional(),
  lessonId: z.uuid().nullable().optional(),
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(10_000).nullable().optional(),
  timeLimitSec: z.number().int().min(30).max(86_400).nullable().optional(),
  passingScore: z.number().min(0).max(100),
  maxAttempts: z.number().int().min(1).max(100),
  status: z.enum(QuizStatus).default(QuizStatus.DRAFT),
});

export const createQuizSchema = quizFields.superRefine((value, context) => {
  if (!value.moduleId && !value.lessonId) {
    context.addIssue({
      code: 'custom',
      path: ['moduleId'],
      message: 'يجب ربط الاختبار بوحدة أو درس',
    });
  }
});
export const updateQuizSchema = quizFields
  .partial()
  .refine((value) => Object.keys(value).length > 0);

const optionSchema = z.object({
  text: z.string().trim().min(1).max(2_000),
  isCorrect: z.boolean(),
  sortOrder: z.number().int().min(0),
});
const questionFields = z.object({
  type: z.enum(QuestionType),
  prompt: z.string().trim().min(2).max(20_000),
  points: z.number().positive().max(10_000),
  sortOrder: z.number().int().min(0),
  options: z.array(optionSchema).max(20).default([]),
});
const validateQuestion = (
  value: z.infer<typeof questionFields>,
  context: z.RefinementCtx,
): void => {
  if (value.type === QuestionType.MCQ) {
    if (value.options.length < 2) {
      context.addIssue({ code: 'custom', path: ['options'], message: 'يلزم خياران على الأقل' });
    }
    if (value.options.filter(({ isCorrect }) => isCorrect).length !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'يلزم تحديد إجابة صحيحة واحدة',
      });
    }
    if (new Set(value.options.map(({ sortOrder }) => sortOrder)).size !== value.options.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'ترتيب الخيارات يجب أن يكون فريداً',
      });
    }
  } else if (value.options.length > 0) {
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'السؤال المقالي لا يقبل خيارات',
    });
  }
};
export const createQuestionSchema = questionFields.superRefine(validateQuestion);
export const updateQuestionSchema = questionFields.superRefine(validateQuestion);

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        attemptQuestionId: z.uuid(),
        selectedOptionId: z.uuid().optional(),
        essayText: z.string().trim().min(1).max(50_000).optional(),
      }),
    )
    .min(1)
    .max(500),
});
export const gradingQueueQuery = z.object({
  status: z.literal('PENDING_REVIEW').default('PENDING_REVIEW'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const gradeAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        attemptQuestionId: z.uuid(),
        points: z.number().min(0).max(10_000),
        feedback: z.string().trim().max(10_000).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
export type GradingQueueInput = z.infer<typeof gradingQueueQuery>;
export type GradeAttemptInput = z.infer<typeof gradeAttemptSchema>;
