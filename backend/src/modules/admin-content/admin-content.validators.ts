import { z } from 'zod';
import { TestimonialStatus } from '../../generated/prisma/enums.js';

export const contentIdParams = z.object({ id: z.uuid() });
export const settingKeyParams = z.object({
  key: z.string().regex(/^[a-z][A-Za-z0-9_.-]{1,158}$/u),
});
export const testimonialSchema = z.object({
  courseId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(3000),
});
export const testimonialQuery = z.object({
  status: z.enum(TestimonialStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const moderationSchema = z.object({
  status: z.enum([TestimonialStatus.APPROVED, TestimonialStatus.REJECTED]),
});
export const faqSchema = z.object({
  question: z.string().trim().min(3).max(3000),
  answer: z.string().trim().min(3).max(10_000),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean().default(true),
});
export const updateFaqSchema = faqSchema.partial().refine((value) => Object.keys(value).length > 0);
export const settingSchema = z.object({
  value: z.json(),
  description: z.string().trim().max(500).nullable().optional(),
});
export const notificationQuery = z.object({
  read: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type TestimonialInput = z.infer<typeof testimonialSchema>;
export type TestimonialQuery = z.infer<typeof testimonialQuery>;
export type ModerationInput = z.infer<typeof moderationSchema>;
export type FaqInput = z.infer<typeof faqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type SettingInput = z.infer<typeof settingSchema>;
export type NotificationQuery = z.infer<typeof notificationQuery>;
