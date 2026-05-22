import { z } from 'zod';

export const CreateIntangibleAssetDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  type: z.enum(['IT scope', 'Admin scope'], {
    errorMap: () => ({ message: 'Type must be either "IT scope" or "Admin scope"' }),
  }),
  status: z.enum(['available', 'assigned'], {
    errorMap: () => ({ message: 'Status must be either "available" or "assigned"' }),
  }).default('available'),
});

export type CreateIntangibleAssetDto = z.infer<typeof CreateIntangibleAssetDtoSchema>;

export const UpdateIntangibleAssetDtoSchema = CreateIntangibleAssetDtoSchema.partial();

export type UpdateIntangibleAssetDto = z.infer<typeof UpdateIntangibleAssetDtoSchema>;

export const CreateIntangibleAssetsBulkDtoSchema = z.object({
  assets: z.array(CreateIntangibleAssetDtoSchema).min(1, 'At least one asset is required'),
});

export type CreateIntangibleAssetsBulkDto = z.infer<typeof CreateIntangibleAssetsBulkDtoSchema>;
