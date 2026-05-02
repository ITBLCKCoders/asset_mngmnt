export const ASSET_STATUSES = [
  'Available',
  'Assigned',
  'For Investigation',
  'For Disposal',
  'Borrowed',
  'Service Unit',
  'For Isolation',
  'Repairing',
] as const;

export const ASSET_CONDITIONS = [
  'New',
  'Excellent',
  'Good',
  'Bad',
  'Needs Repair',
  'Obsolete',
  'Damaged',
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];
