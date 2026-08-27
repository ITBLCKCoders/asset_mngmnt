import { z } from 'zod';

export const CreateIntangibleAssetTypeDtoSchema = z.object({
  name: z.string().min(1, 'Intangible asset type name is required').max(255),
  prefix: z.string().max(10).optional().nullable(),
  departmentId: z.string().min(1, 'Department is required'),
});

export type CreateIntangibleAssetTypeDto = z.infer<
  typeof CreateIntangibleAssetTypeDtoSchema
>;

export const UpdateIntangibleAssetTypeDtoSchema =
  CreateIntangibleAssetTypeDtoSchema.partial();

export type UpdateIntangibleAssetTypeDto = z.infer<
  typeof UpdateIntangibleAssetTypeDtoSchema
>;
