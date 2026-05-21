import type { AssetStatus, AssetCondition } from './assetOptions';

export interface AssetFormData {
  // === BASIC IDENTIFICATION ===
  assetId?: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: string;
  supplier?: string;
  typeId?: string;
  type?: string;
  brandId?: string;
  brand?: string;
  model?: string;
  serial?: string;
  imageUrl?: string;
  imageFile?: File | null;
  documents?: File[];

  // === FINANCIAL & DEPRECIATION ===
  purchaseDate?: string;
  assetValue?: number;
  salvageValue?: number;
  depreciationMethod?: DepreciationMethod;
  usefulLifeYears?: number;
  annualDepreciation?: number;
  depreciationStartDate?: string;

  // === LOCATION & ASSIGNMENT===
  company?: string;
  companyId?: string;
  locationSite?: string;
  locationSiteName?: string;
  locationBuilding?: string;
  department?: string;
  departmentSearch?: string;
  locationRoom?: string;
  locationNotes?: string;
  assignedUser?: string;

  // === OPERATIONAL ===
  warrantyMonths?: number;
  condition?: AssetCondition;
  maintenanceSchedule?:
    | 'Monthly'
    | 'Quarterly'
    | 'Semi-Annual'
    | 'Annually'
    | 'As Needed'
    | 'None';

  // === LEGACY ===
  price?: string;
  status?: AssetStatus;
  isOldUnit?: boolean;
}

const API_MAINTENANCE_SCHEDULE_FORM_VALUES = [
  'Monthly',
  'Quarterly',
  'Semi-Annual',
  'Annually',
  'As Needed',
  'None',
] as const satisfies readonly NonNullable<
  AssetFormData['maintenanceSchedule']
>[];

/** Maps DB/API maintenance_schedule strings to asset form values (handles `Annually` vs `annual`). */
export function mapApiMaintenanceScheduleToForm(
  schedule: string | null | undefined
): AssetFormData['maintenanceSchedule'] {
  if (schedule == null || !String(schedule).trim()) return 'None';
  const trimmed = String(schedule).trim();
  if (
    (API_MAINTENANCE_SCHEDULE_FORM_VALUES as readonly string[]).includes(
      trimmed
    )
  ) {
    return trimmed as NonNullable<AssetFormData['maintenanceSchedule']>;
  }
  switch (trimmed.toLowerCase()) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'semi-annual':
      return 'Semi-Annual';
    case 'annual':
    case 'annually':
      return 'Annually';
    case 'as needed':
      return 'As Needed';
    case 'none':
      return 'None';
    default:
      return 'None';
  }
}

export type DepreciationMethod =
  | 'straight-line'
  | 'declining-balance'
  | 'double-declining'
  | 'units-of-production';

export type UpdateFormHandler = <K extends keyof AssetFormData>(
  key: K,
  value: AssetFormData[K] | ((prev: AssetFormData) => AssetFormData[K])
) => void;

export const initialAssetFormData: AssetFormData = {
  name: '',
  categoryId: '',
  brandId: '',
  assetValue: undefined,
  usefulLifeYears: undefined,
  condition: undefined,
  status: 'Available',
  maintenanceSchedule: undefined,
  depreciationMethod: 'straight-line',
  salvageValue: undefined,
  annualDepreciation: 0,
  company: '',
  locationSite: '',
  locationBuilding: '',
  department: '',
  locationRoom: '',
  locationNotes: '',
  assignedUser: '',
  isOldUnit: false,
};
