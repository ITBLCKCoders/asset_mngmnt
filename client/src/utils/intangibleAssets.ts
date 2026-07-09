export interface IntangibleAssetAssignee {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface IntangibleAssetWithAssignments {
  id: string;
  assignees?: IntangibleAssetAssignee[];
  assigned_to?: string | null;
}

export function isIntangibleAssignedToUser(
  asset: IntangibleAssetWithAssignments,
  userId?: string | null
): boolean {
  if (!userId) return false;
  if (asset.assignees?.some(assignee => assignee.userId === userId)) {
    return true;
  }
  return asset.assigned_to === userId;
}

export function getIntangibleAssigneeCount(asset: IntangibleAssetWithAssignments): number {
  if (asset.assignees?.length) {
    return asset.assignees.length;
  }
  return asset.assigned_to ? 1 : 0;
}
