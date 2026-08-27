import type { AccountabilityForm } from './accountabilityFormTypes';
import {
  classifyDepartmentScopeByName,
  type ClientAssetScopeType,
} from '@/lib/assetScope';

// Returns true when the asset is an intangible (either an embedded intangible
// form asset or a resolved intangible from /intangible-assets).
export const isIntangibleAssetLike = (asset: any): boolean =>
  String(asset?.category ?? '').toLowerCase() === 'intangible' ||
  asset?.type_department != null ||
  asset?.risk_level != null;

// Resolve the Intangible Asset Type's department name, tolerating an object
// ({ id, name }), a raw string, or the flat `type_department_name` column.
export const getIntangibleTypeDepartmentName = (asset: any): string => {
  const raw = asset?.type_department;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && raw.name) return String(raw.name);
  return String(asset?.type_department_name ?? '').trim();
};

// Classify a display asset into IT/Admin scope. Intangibles are classified
// ONLY by their Intangible Asset Type's department: Admin when the type's
// department is Admin/Administration, IT for every other department or when
// the type has no department. The assignment department and the type name are
// deliberately ignored for intangibles.
export const getAssetDisplayScope = (
  asset: any,
  form: AccountabilityForm
): ClientAssetScopeType => {
  if (isIntangibleAssetLike(asset)) {
    return classifyDepartmentScopeByName(
      getIntangibleTypeDepartmentName(asset)
    ) === 'Admin'
      ? 'Admin'
      : 'IT';
  }
  const deptCandidate =
    asset?.categoryDepartment ||
    form.department?.name ||
    form.user?.department?.name ||
    asset?.category ||
    '';
  return classifyDepartmentScopeByName(deptCandidate);
};

// Returns the set of IT/Admin scopes present on the form, derived from the
// form's tangible assets. Falls back to the form/user department when the form
// has no tangible assets. An empty set means the form scope cannot be
// determined, in which case intangibles are not merged into the form.
export const getFormScopes = (
  form: AccountabilityForm
): Set<ClientAssetScopeType> => {
  const scopes = new Set<ClientAssetScopeType>();
  for (const asset of form.assets || []) {
    if (String(asset?.category ?? '').toLowerCase() === 'intangible') continue;
    const scope = classifyDepartmentScopeByName(
      asset?.categoryDepartment ||
        form.department?.name ||
        form.user?.department?.name ||
        asset?.category ||
        ''
    );
    if (scope === 'IT' || scope === 'Admin') scopes.add(scope);
  }
  if (scopes.size === 0) {
    const fallback = classifyDepartmentScopeByName(
      form.department?.name || form.user?.department?.name
    );
    if (fallback === 'IT' || fallback === 'Admin') scopes.add(fallback);
  }
  return scopes;
};

// True when an intangible's classification (by its Intangible Asset Type's
// department) matches one of the form's scopes. Intangibles only appear on the
// accountability form that matches their scope: IT/information-technology (or
// no department) intangibles belong on IT forms, Admin/Administration
// intangibles on Admin forms.
export const intangibleMatchesFormScope = (
  asset: any,
  form: AccountabilityForm
): boolean => getFormScopes(form).has(getAssetDisplayScope(asset, form));

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
// assignment_id field the stored procedure does not return. Only intangibles
// matching the form's scope are returned so an Admin form never shows IT
// intangibles (and vice versa).
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
      ) &&
      intangibleMatchesFormScope(asset, form)
  );

// Merge the form's embedded assets with the intangibles currently assigned to
// the form's user so the card's asset list matches the PDF tables (which
// compose tangible form assets + resolved assigned intangibles). When an
// embedded snapshot asset already exists in the resolved list, fields the
// snapshot is missing (e.g. type_department on old forms) are gap-filled from
// the resolved /intangible-assets record so classification stays accurate.
export const getFormDisplayAssets = (
  form: AccountabilityForm,
  intangibleAssets: any[]
): any[] => {
  const embedded = form.assets || [];
  const merged: any[] = [...embedded];
  const byId = new Map<string, any>(merged.map(a => [String(a.id), a]));
  for (const ia of intangibleAssets || []) {
    const key = String(ia.id);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, ia);
      merged.push(ia);
      continue;
    }
    if (!existing.type_department && ia.type_department) {
      existing.type_department = ia.type_department;
    }
    if (!existing.risk_level && ia.risk_level) {
      existing.risk_level = ia.risk_level;
    }
  }
  return merged.filter(asset =>
    isIntangibleAssetLike(asset)
      ? intangibleMatchesFormScope(asset, form)
      : true
  );
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

