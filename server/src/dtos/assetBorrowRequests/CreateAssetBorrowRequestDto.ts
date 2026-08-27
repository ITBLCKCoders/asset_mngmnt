import { z } from 'zod';

export const CreateAssetBorrowRequestDtoSchema = z.object({
  borrow_scope: z.enum(['it', 'admin']),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000, 'Description max 1000 characters'),
  expected_return_at: z.string().min(1),
  purpose: z.string().trim().min(1, 'Purpose is required'),
  requested_by_signature: z.string().optional(),
});

export type CreateAssetBorrowRequestDto = z.infer<
  typeof CreateAssetBorrowRequestDtoSchema
>;
