import { z } from 'zod';

export const studentCourseQuery = z.object({
  tab: z.enum(['current', 'completed', 'favorites']).default('current'),
  search: z.string().trim().max(160).default(''),
  sort: z.enum(['recent', 'title', 'progress']).default('recent'),
});
export const courseIdParams = z.object({ id: z.uuid() });
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(32).nullable().optional(),
  parentPhone: z.string().trim().min(8).max(32).nullable().optional(),
  gradeId: z.uuid().nullable().optional(),
  governorate: z.string().trim().min(2).max(100).nullable().optional(),
  school: z.string().trim().min(2).max(200).nullable().optional(),
});
const password = z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/);
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
export const notificationPreferencesSchema = z.object({
  emailPayments: z.boolean(),
  emailCourseUpdates: z.boolean(),
  emailQuizResults: z.boolean(),
  inAppPayments: z.boolean(),
  inAppCourseUpdates: z.boolean(),
  inAppQuizResults: z.boolean(),
});

export type StudentCourseQuery = z.infer<typeof studentCourseQuery>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
