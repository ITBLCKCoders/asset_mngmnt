import { z } from 'zod';

/**
 * Minimal user validation schemas - used by users.routes to avoid loading
 * the full validationSchemas (which pulls in many DTOs and can cause startup hang).
 */
export const UserDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  first_name: z.string().min(1, 'First name is required').max(255),
  last_name: z.string().min(1, 'Last name is required').max(255),
  username: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employee_number: z.string().optional().nullable(),
  role_id: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  company_id: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  // Per-user approver settings (persisted in user_custodian_settings)
  hr_accountability_receiver: z.boolean().optional(),
  manager_approver_1: z.boolean().optional(),
  manager_approver_2: z.boolean().optional(),
  manager_approver_3: z.boolean().optional(),
  finance_approver: z.boolean().optional(),
  sub_approver_2: z.boolean().optional(),
  sub_approver_1: z.boolean().optional(),
});

export const UpdateUserDtoSchema = UserDtoSchema.partial();
