import { z } from 'zod';
export const adminListQuery = z.object({
  search: z.string().trim().max(160).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  gradeId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  pricing: z.enum(['all', 'free', 'paid']).default('all'),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'popularity']).default('newest'),
});
export const adminStudentQuery = adminListQuery.extend({
  gradeId: z.uuid().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export const adminIdParams = z.object({ id: z.uuid() });
export const studentStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });
export type AdminListQuery = z.infer<typeof adminListQuery>;
export type AdminStudentQuery = z.infer<typeof adminStudentQuery>;
