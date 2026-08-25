import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(320).pipe(z.email());
const password = z
  .string()
  .min(10)
  .max(128)
  .regex(/[a-z]/, 'يجب أن تحتوي كلمة المرور على حرف إنجليزي صغير')
  .regex(/[A-Z]/, 'يجب أن تحتوي كلمة المرور على حرف إنجليزي كبير')
  .regex(/\d/, 'يجب أن تحتوي كلمة المرور على رقم');
const opaqueToken = z.string().min(32).max(256);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email,
  phone: z.string().trim().min(8).max(32),
  parentPhone: z.string().trim().min(8).max(32),
  gradeId: z.uuid(),
  governorate: z.string().trim().min(2).max(100),
  school: z.string().trim().min(2).max(200),
  password,
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const tokenSchema = z.object({ token: opaqueToken });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: opaqueToken, password });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
