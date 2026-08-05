export interface SearchColumnOption {
  label: string;
  value: string;
}

export const ASSET_SEARCH_COLUMNS_BASIC: SearchColumnOption[] = [
  { label: 'All Columns', value: 'all' },
  { label: 'Asset Code', value: 'id' },
  { label: 'Asset Name', value: 'name' },
  { label: 'Description', value: 'description' },
  { label: 'Category', value: 'category' },
  { label: 'Type', value: 'type' },
  { label: 'Serial No', value: 'serialNo' },
  { label: 'Model', value: 'modelNo' },
  { label: 'Brand', value: 'brand' },
  { label: 'Department', value: 'department' },
  { label: 'Location', value: 'location' },
];

export const MY_ASSETS_SEARCH_COLUMNS: SearchColumnOption[] = [
  ...ASSET_SEARCH_COLUMNS_BASIC,
  { label: 'Assigned To', value: 'assignedTo' },
  { label: 'Supplier', value: 'supplier' },
];

export const ASSET_SEARCH_COLUMNS: SearchColumnOption[] = [
  { label: 'All Columns', value: 'all' },
  { label: 'Asset Code', value: 'id' },
  { label: 'Asset Name', value: 'name' },
  { label: 'Description', value: 'description' },
  { label: 'Category', value: 'category' },
  { label: 'Type', value: 'type' },
  { label: 'Serial No', value: 'serialNo' },
  { label: 'Model', value: 'modelNo' },
  { label: 'Brand', value: 'brand' },
  { label: 'Status', value: 'status' },
  { label: 'Assigned To', value: 'assignedTo' },
  { label: 'Department', value: 'department' },
  { label: 'Location', value: 'location' },
  { label: 'Supplier', value: 'supplier' },
  { label: 'Condition', value: 'condition' },
  { label: 'Company', value: 'company' },
  { label: 'Building', value: 'building' },
];

export const INTANGIBLE_ASSET_SEARCH_COLUMNS: SearchColumnOption[] = [
  { label: 'All Columns', value: 'all' },
  { label: 'Name', value: 'name' },
  { label: 'Description', value: 'description' },
  { label: 'Remarks', value: 'remarks' },
  { label: 'Type', value: 'type' },
  { label: 'Risk Level', value: 'risk_level' },
  { label: 'Assigned To', value: 'assigned_to' },
  { label: 'Created By', value: 'created_by_name' },
  { label: 'Updated By', value: 'updated_by_name' },
];

export function matchAssetField(asset: any, field: string, query: string): boolean {
  const val = asset[field];
  return val != null && String(val).toLowerCase().includes(query);
}

export function matchAssetAcrossColumns(asset: any, query: string, columns: string[]): boolean {
  return columns.some(col => matchAssetField(asset, col, query));
}
