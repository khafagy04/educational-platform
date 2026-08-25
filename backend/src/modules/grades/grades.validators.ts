import { z } from 'zod';
import { EducationStage } from '../../generated/prisma/enums.js';

export const gradeIdParams = z.object({ id: z.uuid() });
export const createGradeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/),
  stage: z.enum(EducationStage),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean().default(true),
});
export const updateGradeSchema = createGradeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
