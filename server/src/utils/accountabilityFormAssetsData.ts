export type AccountabilityFormAssetRef = {
  id?: string;
  code?: string;
  type?: string;
  category?: string;
};

function parseAssetsDataObject(
  assetsDataRaw: unknown
): Record<string, unknown> | null {
  if (assetsDataRaw == null || assetsDataRaw === '') {
    return null;
  }
  try {
    const raw = Buffer.isBuffer(assetsDataRaw)
      ? assetsDataRaw.toString('utf8')
      : assetsDataRaw;
    return typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : null;
  } catch {
    return null;
  }
}

export function parseAssetsFromAssetsData(
  assetsDataRaw: unknown
): AccountabilityFormAssetRef[] {
  const assetsData = parseAssetsDataObject(assetsDataRaw);
  if (!assetsData || !Array.isArray(assetsData.assets)) {
    return [];
  }
  const assets: AccountabilityFormAssetRef[] = [];
  for (const a of assetsData.assets as AccountabilityFormAssetRef[]) {
    if (a && typeof a === 'object') {
      assets.push(a);
    }
  }
  return assets;
}

/** Resolve assignment IDs stored on an accountability form for checklist lookup. */
export function parseAssignmentIdsFromAssetsData(
  assetsDataRaw: unknown,
  fallbackAssignmentId?: string | null
): string[] {
  const ids: string[] = [];
  const assetsData = parseAssetsDataObject(assetsDataRaw);
  if (assetsData) {
    const assignmentIds = assetsData.assignment_ids;
    if (Array.isArray(assignmentIds)) {
      for (const id of assignmentIds) {
        const s = String(id ?? '').trim();
        if (s) ids.push(s);
      }
    }
  }
  if (ids.length === 0 && fallbackAssignmentId) {
    const s = String(fallbackAssignmentId).trim();
    if (s) ids.push(s);
  }
  return [...new Set(ids)];
}

/**
 * Collect assignment IDs for checklist lookup: stored JSON ids plus active
 * assignments for computer-type assets on the form.
 */
export async function resolveChecklistAssignmentIds(params: {
  assetsDataRaw: unknown;
  fallbackAssignmentId?: string | null;
  userId: string;
  getActiveAssignmentIdsByAssetIds: (
    userId: string,
    assetIds: string[]
  ) => Promise<string[]>;
  getActiveAssignmentIdsByAssetCodes: (
    userId: string,
    assetCodes: string[]
  ) => Promise<string[]>;
  isComputerType: (typeName: string | null | undefined) => boolean;
}): Promise<string[]> {
  const {
    assetsDataRaw,
    fallbackAssignmentId,
    userId,
    getActiveAssignmentIdsByAssetIds,
    getActiveAssignmentIdsByAssetCodes,
    isComputerType,
  } = params;

  const ids = new Set(
    parseAssignmentIdsFromAssetsData(assetsDataRaw, fallbackAssignmentId)
  );

  const formAssets = parseAssetsFromAssetsData(assetsDataRaw);
  const computerAssets = formAssets.filter(a =>
    isComputerType(String(a.type ?? ''))
  );

  const assetIds = [
    ...new Set(
      computerAssets
        .map(a => String(a.id ?? '').trim())
        .filter(id => id.length > 0)
    ),
  ];
  const assetCodes = [
    ...new Set(
      computerAssets
        .map(a => String(a.code ?? '').trim())
        .filter(code => code.length > 0)
    ),
  ];

  if (assetIds.length > 0) {
    const fromIds = await getActiveAssignmentIdsByAssetIds(userId, assetIds);
    for (const id of fromIds) ids.add(id);
  }
  if (assetCodes.length > 0) {
    const fromCodes = await getActiveAssignmentIdsByAssetCodes(
      userId,
      assetCodes
    );
    for (const id of fromCodes) ids.add(id);
  }

  return [...ids];
}