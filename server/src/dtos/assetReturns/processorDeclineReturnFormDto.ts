import { z } from 'zod';

export const processorDeclineReturnFormBodySchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(5000),
});

export type ProcessorDeclineReturnFormBody = z.infer<
  typeof processorDeclineReturnFormBodySchema
>;
