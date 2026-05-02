import { z } from 'zod';

export const ProcessBorrowReturnDtoSchema = z.object({
  return_condition: z
    .string()
    .min(1, 'return_condition is required')
    .max(50, 'return_condition too long'),
  return_remarks: z.string().max(1000, 'return_remarks too long').optional(),
  /** Optional photo URLs (from upload-condition-photo), max 5 */
  condition_images: z.array(z.string().min(1)).max(5).optional(),
  verification_received: z.boolean(),
  verification_same_condition: z.boolean(),
});

export type ProcessBorrowReturnDto = z.infer<typeof ProcessBorrowReturnDtoSchema>;
