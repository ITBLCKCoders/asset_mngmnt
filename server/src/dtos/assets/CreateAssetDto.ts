import { z } from 'zod';

export const CreateAssetDtoSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(255),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  supplier: z.string().optional().nullable(),
  typeId: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  assetValue: z.number().optional().nullable(),
  salvageValue: z.number().default(0),
  depreciationMethod: z
    .enum([
      'straight-line',
      'declining-balance',
      'double-declining',
      'units-of-production',
    ])
    .optional()
    .nullable(),
  usefulLifeYears: z.number().optional().nullable(),
  annualDepreciation: z.number().optional().nullable(),
  bookValue: z.number().optional().nullable(),
  accumulatedDepreciation: z.number().optional().nullable(),
  monthlyDepreciation: z.number().optional().nullable(),
  depreciationStartDate: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  locationRoomId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  locationNotes: z.string().optional().nullable(),
  warrantyMonths: z.number().optional().nullable(),
  // Optional & nullable to match the shared `CreateAssetDto` interface in
  // `shared/types/dtos/asset.dtos.ts`. Callers that don't supply a value get
  // a graceful default at the controller / service layer.
  condition: z
    .enum(['New', 'Excellent', 'Good', 'Bad', 'Needs Repair', 'Obsolete', 'Damaged'])
    .optional()
    .nullable(),
  maintenanceSchedule: z
    .enum([
      'Monthly',
      'Quarterly',
      'Semi-Annual',
      'Annually',
      'As Needed',
      'None',
    ])
    .optional()
    .nullable(),
  status: z
    .enum([
      'Available',
      'Assigned',
      'In Use',
      'For Investigation',
      'For Disposal',
      'Borrowed',
      'Service Unit',
      'For Isolation',
      'Repairing',
      'Under Maintenance',
      'Retired',
      'Disposed',
      'Lost',
    ])
    .default('Available'),
  isOldUnit: z.boolean().default(false),
  assignedUser: z.string().optional().nullable(),
});

export type CreateAssetDto = z.infer<typeof CreateAssetDtoSchema>;

export const UpdateAssetDtoSchema = CreateAssetDtoSchema.partial().extend({
  assetId: z.string().min(1, 'Asset ID is required'),
  isOldUnit: z
    .union([
      z.boolean(),
      z.literal('true'),
      z.literal('false'),
      z.literal('1'),
      z.literal('0'),
      z.number(),
    ])
    .transform(val => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === 1;
      if (val === 'true' || val === '1') return true;
      if (val === 'false' || val === '0') return false;
      return false;
    })
    .optional()
    .default(false),
  purchaseDate: z
    .string()
    .optional()
    .nullable()
    .transform(val => {
      if (!val) return null;
      try {
        // Handle various date formats
        const date = new Date(val);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      } catch {
        return null;
      }
    }),
  depreciationStartDate: z
    .string()
    .optional()
    .nullable()
    .transform(val => {
      if (!val) return null;
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      } catch {
        return null;
      }
    }),
});

export type UpdateAssetDto = z.infer<typeof UpdateAssetDtoSchema>;
