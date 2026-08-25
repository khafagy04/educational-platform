import { z } from 'zod';
export const analyticsQuery = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export const exportParams = z.object({ report: z.enum(['revenue', 'payments', 'engagement']) });
export const exportQuery = analyticsQuery.extend({ format: z.enum(['csv', 'xlsx']) });
export type AnalyticsQuery = z.infer<typeof analyticsQuery>;
export type ExportQuery = z.infer<typeof exportQuery>;
