import { z } from 'zod';

export const createIntangibleDeactivationSchema = z.object({
  intangibleAssetIds: z.array(z.string().trim().min(1)).min(1, 'Select at least one intangible asset'),
  digitalSignature: z.string().trim().min(1, 'Digital signature is required'),
  remarks: z.string().trim().max(2000).optional().nullable(),
});

export type CreateIntangibleDeactivationBody = z.infer<typeof createIntangibleDeactivationSchema>;

export const approveIntangibleDeactivationSchema = z.object({
  digitalSignature: z.string().trim().min(1, 'Digital signature is required'),
});

export type ApproveIntangibleDeactivationBody = z.infer<typeof approveIntangibleDeactivationSchema>;

export const declineIntangibleDeactivationSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(2000),
});

export type DeclineIntangibleDeactivationBody = z.infer<typeof declineIntangibleDeactivationSchema>;
