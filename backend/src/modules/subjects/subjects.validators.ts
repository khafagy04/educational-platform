import { z } from 'zod';

export const subjectIdParams = z.object({ id: z.uuid() });
export const subjectListQuery = z.object({ gradeId: z.uuid().optional() });
export const createSubjectSchema = z.object({
  gradeId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean().default(true),
});
export const updateSubjectSchema = createSubjectSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
