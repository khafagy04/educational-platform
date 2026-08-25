import { z } from 'zod';

export const progressLessonParams = z.object({ id: z.uuid() });
export const progressCourseParams = z.object({ id: z.uuid() });
export const updateProgressSchema = z.object({
  progressPct: z.number().min(0).max(100),
  lastPositionSec: z.number().int().min(0).max(86_400),
  watchedSeconds: z.number().int().min(0).max(86_400),
  completed: z.boolean().default(false),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
