import { z } from 'zod';

export const CreateRiskLevelDtoSchema = z.object({
  name: z.string().min(1, 'Risk level name is required').max(255),
  color: z.string().max(50).optional().nullable(),
});

export type CreateRiskLevelDto = z.infer<typeof CreateRiskLevelDtoSchema>;

export const UpdateRiskLevelDtoSchema = CreateRiskLevelDtoSchema.partial();

export type UpdateRiskLevelDto = z.infer<typeof UpdateRiskLevelDtoSchema>;
