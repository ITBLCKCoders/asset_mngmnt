import type { AccountabilityForm } from './accountabilityFormTypes';

// Returns true when the asset is an intangible (either an embedded intangible
// form asset or a resolved intangible from /intangible-assets).
export const isIntangibleAssetLike = (asset: any): boolean =>
  String(asset?.category ?? '').toLowerCase() === 'intangible' ||
  asset?.type_department != null ||
  asset?.risk_level != null;

export const fetchAssignedIntangibleAssetsForForm = (
  form: AccountabilityForm
): any[] => {
  return (form.assets || []).filter(
    (asset: any) => String(asset.category ?? '').toLowerCase() === 'intangible'
  );
};

// Resolve the intangible assets currently assigned to the form's user from the
// company's intangible asset list. sp_GetAllIntangibleAssets exposes assignees
// as a JSON array (from intangible_asset_assignments or the legacy assigned_to
// column), so we match on the assignee user id rather than a top-level
// assignment_id field the stored procedure does not return.
export const getFormAssignedIntangibleAssets = (
  assets: any[],
  form: AccountabilityForm
): any[] =>
  (assets || []).filter(
    (asset: any) =>
      Array.isArray(asset.assignees) &&
      asset.assignees.some(
        (a: any) =>
          String(a.userId ?? a.userID ?? '').trim() === String(form.user.id)
      )
  );

// Merge the form's embedded assets with the intangibles currently assigned to
// the form's user so the card's asset list matches the PDF tables (which
// compose tangible form assets + resolved assigned intangibles).
export const getFormDisplayAssets = (
  form: AccountabilityForm,
  intangibleAssets: any[]
): any[] => {
  const embedded = form.assets || [];
  const merged = [...embedded];
  const seen = new Set<string>(embedded.map(a => String(a.id)));
  for (const ia of intangibleAssets || []) {
    const key = String(ia.id);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(ia);
    }
  }
  return merged;
};

// Split display assets into tangible and intangible groups so the card can
// render them separately (Tangible Assets N / Intangible Assets N).
export const splitDisplayAssets = (
  assets: any[]
): { tangible: any[]; intangible: any[] } => {
  const tangible: any[] = [];
  const intangible: any[] = [];
  for (const asset of assets || []) {
    if (isIntangibleAssetLike(asset)) {
      intangible.push(asset);
    } else {
      tangible.push(asset);
    }
  }
  return { tangible, intangible };
};

// Deduplicated union of asset lists by asset id. Used to make sure the PDF and
// the modals always compose the complete intangible set: the intangibles
// embedded in the form snapshot plus the intangibles currently assigned to the
// form's user.
export const mergeAssetsById = (...lists: any[][]): any[] => {
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const list of lists) {
    for (const a of list || []) {
      const key = String(a?.id ?? '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(a);
    }
  }
  return merged;
};