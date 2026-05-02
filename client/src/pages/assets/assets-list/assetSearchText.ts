import { format } from 'date-fns';
import type { Asset } from './assetsComponents/assetTable/assetData';

/** Builds a single searchable string from all asset fields so the search bar can match any column. */
export function assetSearchText(asset: Asset): string {
  const parts: string[] = [];
  const add = (v: unknown) => {
    if (v == null) return;
    if (v instanceof Date && !isNaN(v.getTime()))
      parts.push(format(v, 'MMM d yyyy'));
    else if (typeof v === 'object') parts.push(JSON.stringify(v));
    else parts.push(String(v));
  };
  parts.push(
    asset.id ?? '',
    asset.name ?? '',
    asset.description ?? '',
    asset.category ?? '',
    asset.type ?? ''
  );
  parts.push(asset.serialNo ?? '', asset.modelNo ?? '', asset.brand ?? '');
  const status =
    asset.isAssetBuilder && asset.builderStatus
      ? asset.builderStatus
      : asset.status;
  parts.push(status ?? '');
  const assignment = asset.currentAssignment;
  if (assignment?.user) {
    parts.push(
      assignment.user.name ?? '',
      assignment.user.employeeNumber ?? '',
      assignment.user.position ?? ''
    );
  }
  parts.push(asset.department ?? '', asset.location ?? '');
  if (asset.purchaseDate) add(asset.purchaseDate);
  parts.push(asset.purchasePrice != null ? String(asset.purchasePrice) : '');
  parts.push(asset.supplier ?? '');
  parts.push(
    asset.warranty ?? '',
    asset.warranty_months != null ? String(asset.warranty_months) : ''
  );
  parts.push(
    asset.documents?.length != null ? String(asset.documents.length) : ''
  );
  parts.push(asset.maintenanceSchedule ?? '');
  if (asset.lastMaintenanceDate) add(asset.lastMaintenanceDate);
  if (asset.nextMaintenanceDate) add(asset.nextMaintenanceDate);
  parts.push(
    asset.condition ?? '',
    asset.usefulLifeYears != null ? String(asset.usefulLifeYears) : ''
  );
  parts.push(asset.salvageValue != null ? String(asset.salvageValue) : '');
  parts.push(
    asset.depreciationMethod ?? '',
    asset.annualDepreciation != null ? String(asset.annualDepreciation) : ''
  );
  if (asset.depreciationStartDate) add(asset.depreciationStartDate);
  parts.push(
    asset.company ?? '',
    asset.building ?? '',
    asset.createdBy ?? '',
    asset.updatedBy ?? ''
  );
  if (asset.createdAt) add(asset.createdAt);
  if (asset.updatedAt) add(asset.updatedAt);
  return parts.join(' ').toLowerCase();
}
