import { z } from 'zod';

export const videoLessonParams = z.object({ id: z.uuid() });
export const createVideoUploadSchema = z.object({
  maxDurationSeconds: z.number().int().min(1).max(36_000),
});

export type CreateVideoUploadInput = z.infer<typeof createVideoUploadSchema>;
