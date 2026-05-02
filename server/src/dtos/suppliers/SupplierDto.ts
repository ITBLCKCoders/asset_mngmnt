import { z } from 'zod';

export const CreateSupplierDtoSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  categoryId: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  email: z.preprocess(
    val => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().email('Invalid email format').optional().nullable()
  ),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type CreateSupplierDto = z.infer<typeof CreateSupplierDtoSchema>;

export const UpdateSupplierDtoSchema = CreateSupplierDtoSchema.partial();

export type UpdateSupplierDto = z.infer<typeof UpdateSupplierDtoSchema>;
