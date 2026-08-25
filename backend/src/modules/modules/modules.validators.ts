import { z } from 'zod';

export const moduleIdParams = z.object({ id: z.uuid() });
export const courseModulesParams = z.object({ courseId: z.uuid() });
export const createModuleSchema = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(10_000).optional(),
  sortOrder: z.number().int().min(0),
});
export const updateModuleSchema = createModuleSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const reorderModulesSchema = z
  .object({
    items: z
      .array(z.object({ id: z.uuid(), sortOrder: z.number().int().min(0) }))
      .min(1)
      .max(200),
  })
  .superRefine(({ items }, context) => {
    if (new Set(items.map(({ id }) => id)).size !== items.length) {
      context.addIssue({ code: 'custom', path: ['items'], message: 'لا يجوز تكرار الوحدة' });
    }
    if (new Set(items.map(({ sortOrder }) => sortOrder)).size !== items.length) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'ترتيب الوحدات يجب أن يكون فريداً',
      });
    }
  });
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>;
