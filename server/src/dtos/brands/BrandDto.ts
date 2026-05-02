import { z } from 'zod';

export const CreateBrandDtoSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(255),
  typeId: z.string().min(1, 'Type is required'),
  prefix: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type CreateBrandDto = z.infer<typeof CreateBrandDtoSchema>;

export const UpdateBrandDtoSchema = CreateBrandDtoSchema.partial();

export type UpdateBrandDto = z.infer<typeof UpdateBrandDtoSchema>;
