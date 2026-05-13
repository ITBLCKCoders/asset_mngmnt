import { z } from 'zod';

export const CreateGatePassDtoSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required'),
  assetId: z.string().min(1, 'Asset ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  expectedReturnDate: z.string().optional().nullable(),
  destinationLocationId: z.string().optional().nullable(),
  destinationDepartmentId: z.string().optional().nullable(),
  condition: z
    .enum(['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged'])
    .default('Good'),
  notes: z.string().optional().nullable(),
});

export type CreateGatePassDto = z.infer<typeof CreateGatePassDtoSchema>;

export const UpdateGatePassDtoSchema = CreateGatePassDtoSchema.partial().extend({
  gatePassId: z.string().min(1, 'Gate Pass ID is required'),
  status: z
    .enum(['Pending', 'Approved', 'Completed', 'Cancelled'])
    .optional(),
  actualReturnDate: z.string().optional().nullable(),
});

export type UpdateGatePassDto = z.infer<typeof UpdateGatePassDtoSchema>;
