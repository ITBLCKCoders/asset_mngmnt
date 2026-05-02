import { z } from 'zod';

export const CreateCategoryDtoSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  prefix: z.string().min(2, 'Prefix must be 2-10 characters').max(10),
  gl_code: z.string().min(1, 'GL code is required'),
  departmentId: z.string().min(1, 'Department is required'),
  description: z.string().optional().nullable(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategoryDtoSchema>;

export const UpdateCategoryDtoSchema = CreateCategoryDtoSchema.partial();

export type UpdateCategoryDto = z.infer<typeof UpdateCategoryDtoSchema>;
