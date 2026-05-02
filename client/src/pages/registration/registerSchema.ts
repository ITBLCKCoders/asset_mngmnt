import { z } from 'zod';

/** Sentinel value selected when the user picks "Other / Not listed" company. */
export const OTHER_COMPANY_ID = 'other';

/**
 * Zod schema validating the new-user registration form.
 *
 * Mirrors the server-side `RegisterDtoSchema` shape. Extracted from the
 * registration page so the schema can be unit-tested in isolation and the
 * page component stays focused on UI/state.
 */
export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    username: z.string().min(3, 'Username must be 3 characters long'),
    contactNumber: z
      .string()
      .refine(v => /^(\+63|63)[0-9]{10}$/.test(v.replace(/\s/g, '')), {
        message: 'Enter a valid Philippine mobile number',
      }),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(
        6,
        'Password must 8 characters long and contain Uppercase, Number and special character'
      ),
    confirmPassword: z.string(),
    company_id: z.string().min(1, 'Company is required'),
    department_id: z.string().min(1, 'Department is required'),
    position: z.string().min(1, 'Position is required'),
    employeeNumber: z.string().min(1, 'Employee number is required'),
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type RegisterForm = z.infer<typeof registerSchema>;
