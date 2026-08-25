import { z } from 'zod';
import { CourseStatus } from '../../generated/prisma/enums.js';

export const courseIdParams = z.object({ id: z.uuid() });
export const courseSlugParams = z.object({ slug: z.string().min(1).max(240) });
export const courseListQuery = z.object({
  gradeId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  search: z.string().trim().max(160).default(''),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  pricing: z.enum(['all', 'free', 'paid']).default('all'),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'popularity']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export const createCourseSchema = z.object({
  gradeId: z.uuid(),
  subjectId: z.uuid(),
  title: z.string().trim().min(3).max(220),
  slug: z.string().trim().min(2).max(240).optional(),
  description: z.string().trim().min(10).max(20_000),
  price: z.coerce.number().min(0).max(99_999_999.99),
  accessDurationDays: z.number().int().min(1).max(3650).default(365),
  status: z.enum(CourseStatus).default(CourseStatus.DRAFT),
});
export const updateCourseSchema = createCourseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
