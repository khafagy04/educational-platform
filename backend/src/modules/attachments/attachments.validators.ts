import { z } from 'zod';

export const attachmentIdParams = z.object({ id: z.uuid() });
export const lessonAttachmentsParams = z.object({ lessonId: z.uuid() });
export const attachmentMetadataSchema = z.object({
  title: z.string().trim().min(2).max(220),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type AttachmentMetadataInput = z.infer<typeof attachmentMetadataSchema>;
