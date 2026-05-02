import { z } from 'zod';

export const declineAccountabilityFormBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required')
    .max(2000, 'Reason must be at most 2000 characters'),
});

export type DeclineAccountabilityFormBody = z.infer<
  typeof declineAccountabilityFormBodySchema
>;
