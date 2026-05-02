import { z } from 'zod';

export const CreateTypeDtoSchema = z.object({
  name: z.string().min(1, 'Type name is required').max(255),
  categoryId: z.string().min(1, 'Category is required'),
  prefix: z.string().min(1, 'Type prefix is required').max(10),
  description: z.string().optional().nullable(),
});

export type CreateTypeDto = z.infer<typeof CreateTypeDtoSchema>;

export const UpdateTypeDtoSchema = CreateTypeDtoSchema.partial();

export type UpdateTypeDto = z.infer<typeof UpdateTypeDtoSchema>;
