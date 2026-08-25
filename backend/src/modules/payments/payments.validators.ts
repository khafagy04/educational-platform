import { z } from 'zod';

export const topupSchema = z.object({
  amount: z.number().positive().max(100_000).multipleOf(0.01),
});
export const createOrderSchema = z.object({ courseId: z.uuid() });
export const orderIdParams = z.object({ id: z.uuid() });
export const payOrderSchema = z.object({ method: z.enum(['WALLET', 'FAWATERK']) });
export const transactionListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const fawaterkWebhookSchema = z.object({
  hashKey: z.string().regex(/^[a-fA-F0-9]{64}$/),
  invoice_key: z.string().min(1).max(255),
  invoice_id: z.union([z.string().min(1).max(255), z.number().int().nonnegative()]),
  payment_method: z.string().min(1).max(120),
  invoice_status: z.string().min(1).max(40),
  pay_load: z.unknown().optional(),
  referenceNumber: z.string().max(255).optional(),
});

export type TopupInput = z.infer<typeof topupSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PayOrderInput = z.infer<typeof payOrderSchema>;
export type TransactionListInput = z.infer<typeof transactionListQuery>;
export type FawaterkWebhookInput = z.infer<typeof fawaterkWebhookSchema>;
