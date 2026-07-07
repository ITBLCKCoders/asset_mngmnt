import { z } from 'zod';

export const CreateAssetBorrowRequestDtoSchema = z.object({
  borrow_scope: z.enum(['it', 'admin']),
  category_id: z.string().uuid(),
  type_id: z.string().uuid(),
  expected_return_at: z.string().min(1),
  purpose: z.string().trim().min(1, 'Purpose is required'),
  requested_by_signature: z.string().optional(),
});

export type CreateAssetBorrowRequestDto = z.infer<
  typeof CreateAssetBorrowRequestDtoSchema
>;
