import { z } from 'zod';
import { LessonType } from '../../generated/prisma/enums.js';

export const lessonIdParams = z.object({ id: z.uuid() });
export const moduleLessonsParams = z.object({ moduleId: z.uuid() });
const lessonFields = z.object({
  title: z.string().trim().min(2).max(220),
  slug: z.string().trim().min(2).max(240).optional(),
  description: z.string().trim().max(10_000).optional(),
  type: z.enum(LessonType),
  textContent: z.string().max(100_000).optional(),
  durationSec: z.number().int().min(0).max(86_400).optional(),
  isFree: z.boolean().default(false),
  isRequired: z.boolean().default(true),
  sortOrder: z.number().int().min(0),
});

export const createLessonSchema = lessonFields.superRefine((value, context) => {
  if (value.type === LessonType.TEXT && !value.textContent?.trim()) {
    context.addIssue({
      code: 'custom',
      path: ['textContent'],
      message: 'محتوى الدرس النصي مطلوب',
    });
  }
});
export const updateLessonSchema = lessonFields
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const reorderLessonsSchema = z
  .object({
    items: z
      .array(z.object({ id: z.uuid(), sortOrder: z.number().int().min(0) }))
      .min(1)
      .max(500),
  })
  .superRefine(({ items }, context) => {
    if (new Set(items.map(({ id }) => id)).size !== items.length) {
      context.addIssue({ code: 'custom', path: ['items'], message: 'لا يجوز تكرار الدرس' });
    }
    if (new Set(items.map(({ sortOrder }) => sortOrder)).size !== items.length) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'ترتيب الدروس يجب أن يكون فريداً',
      });
    }
  });
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
