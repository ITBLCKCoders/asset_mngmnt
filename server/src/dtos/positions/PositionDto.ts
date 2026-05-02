import { z } from 'zod';

export const CreatePositionDtoSchema = z.object({
  name: z.string().min(1, 'Position name is required').max(255),
  description: z.string().optional().nullable(),
  departmentId: z.string().min(1, 'Department ID is required'),
});

export type CreatePositionDto = z.infer<typeof CreatePositionDtoSchema>;

export const UpdatePositionDtoSchema = CreatePositionDtoSchema.partial().extend(
  {
    positionId: z.string().min(1, 'Position ID is required'),
  }
);

export type UpdatePositionDto = z.infer<typeof UpdatePositionDtoSchema>;
