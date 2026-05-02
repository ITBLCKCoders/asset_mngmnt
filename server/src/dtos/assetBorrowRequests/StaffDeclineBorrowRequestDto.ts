import { z } from 'zod';

export const StaffDeclineBorrowRequestDtoSchema = z.object({
  reason: z.string().min(1, 'reason is required').max(1000, 'reason too long'),
});

export type StaffDeclineBorrowRequestDto = z.infer<
  typeof StaffDeclineBorrowRequestDtoSchema
>;
