import { z } from 'zod';

export const StaffApproveBorrowRequestDtoSchema = z.object({
  asset_code: z.string().min(1, 'asset_code is required'),
  pre_usage_condition: z
    .string()
    .min(1, 'pre_usage_condition is required')
    .max(50, 'pre_usage_condition too long'),
  processor_remarks: z
    .string()
    .max(1000, 'processor_remarks too long')
    .optional(),
  /** Optional photo URLs (from upload-condition-photo), max 5 */
  condition_images: z.array(z.string().min(1)).max(5).optional(),
});

export type StaffApproveBorrowRequestDto = z.infer<
  typeof StaffApproveBorrowRequestDtoSchema
>;

