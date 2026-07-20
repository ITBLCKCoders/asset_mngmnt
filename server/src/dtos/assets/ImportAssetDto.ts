import { z } from 'zod';

const ImportAssetRowSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(255),
  description: z.string().optional().nullable(),
  category: z.string().min(1, 'Category is required'),
  type: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  assetValue: z.number().optional().nullable(),
  salvageValue: z.number().optional().nullable(),
  depreciationMethod: z
    .enum(['straight-line', 'declining-balance', 'double-declining', 'units-of-production'])
    .optional()
    .nullable(),
  usefulLifeYears: z.number().optional().nullable(),
  depreciationStartDate: z.string().optional().nullable(),
  company: z.string().min(1, 'Company is required'),
  building: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  locationSite: z.string().optional().nullable(),
  locationRoom: z.string().optional().nullable(),
  locationNotes: z.string().optional().nullable(),
  warrantyMonths: z.number().optional().nullable(),
  condition: z
    .enum(['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Bad', 'Needs Repair', 'Obsolete', 'Damaged'])
    .optional()
    .nullable(),
  maintenanceSchedule: z
    .enum(['Monthly', 'Quarterly', 'Semi-Annual', 'Annually', 'As Needed', 'None'])
    .optional()
    .nullable(),
  status: z
    .enum(['Available', 'Assigned', 'In Use', 'For Investigation', 'For Disposal', 'Borrowed', 'Service Unit', 'For Isolation', 'Repairing', 'Under Maintenance', 'Retired', 'Disposed', 'Lost'])
    .optional()
    .nullable(),
  isOldUnit: z.boolean().optional().nullable(),
  assignedUser: z.string().optional().nullable(),
});

const ImportBuilderRowSchema = z.object({
  builderName: z.string().min(1, 'Builder name is required').max(255),
  builderDescription: z.string().optional().nullable(),
  assetCode: z.string().min(1, 'Asset code is required'),
  isParent: z
    .union([z.boolean(), z.literal('yes'), z.literal('no'), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .transform(val => {
      if (typeof val === 'boolean') return val;
      return val === 'yes' || val === 'true' || val === '1';
    })
    .optional()
    .default(false),
});

export const ImportAssetsRequestSchema = z.object({
  assets: z.array(ImportAssetRowSchema).min(1, 'At least one asset row is required'),
  builders: z.array(ImportBuilderRowSchema).optional().default([]),
});

export type ImportAssetRow = z.infer<typeof ImportAssetRowSchema>;
export type ImportBuilderRow = z.infer<typeof ImportBuilderRowSchema>;
export type ImportAssetsRequest = z.infer<typeof ImportAssetsRequestSchema>;
