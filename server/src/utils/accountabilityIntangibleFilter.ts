import { pool } from '../db.js';

/**
 * Shared read-time filter: `accountability_forms.assets_data` is a frozen
 * snapshot, so a replacement form created after an intangible deactivation
 * can still list the deactivated intangible. Prune any `Intangible` entry
 * with no live `Active` assignment for the form owner before serving rows
 * to list endpoints, the detail endpoint (which feeds the PDF preview),
 * and the PDF itself.
 *
 * Fail-open everywhere: on any error the original data is returned so
 * approvals/PDF never break because of this filter.
 */

export function intangibleEntryKey(entry: any): string {
  return String(entry?.id ?? entry?.intangible_asset_id ?? entry?.assetID ?? '').trim();
}

export function isIntangibleEntry(entry: any): boolean {
  return String(entry?.category ?? '') === 'Intangible';
}

/** Live Active intangible ids for one owner. Returns undefined on DB error (fail-open). */
export async function getActiveIntangibleIdsForUser(
  userId: string
): Promise<Set<string> | undefined> {
  try {
    const [rows] = (await pool.execute(
      `SELECT intangible_asset_id FROM intangible_asset_assignments
        WHERE user_id = ? AND status = 'Active' AND deleted_at IS NULL`,
      [userId]
    )) as any[];
    return new Set((rows as any[]).map(r => String(r.intangible_asset_id).trim()).filter(Boolean));
  } catch {
    return undefined;
  }
}

/** Pure prune: drop Intangible entries whose key is not in `active` (undefined = keep all). */
export function pruneInactiveIntangibleAssets(
  assets: any[],
  active: Set<string> | undefined
): any[] {
  if (!active) return assets;
  return assets.filter(a => {
    if (!isIntangibleEntry(a)) return true;
    const key = intangibleEntryKey(a);
    return !key || active.has(key);
  });
}

/** Pure prune: drop Intangible entries HR-deactivated for the owner (undefined/empty = keep all). */
export function pruneDeactivatedIntangibles(
  assets: any[],
  dead: Set<string> | undefined
): any[] {
  if (!dead || dead.size === 0) return assets;
  return assets.filter(a => {
    if (!isIntangibleEntry(a)) return true;
    const key = intangibleEntryKey(a);
    return !key || !dead.has(key);
  });
}

function parseDeactivationAssetsData(raw: unknown): string[] {
  try {
    const obj = Buffer.isBuffer(raw)
      ? JSON.parse((raw as Buffer).toString('utf8'))
      : typeof raw === 'string'
        ? JSON.parse(raw)
        : raw;
    const ids: string[] = [];
    if (obj && typeof obj === 'object') {
      if (Array.isArray((obj as any).intangibleAssetIds)) {
        for (const v of (obj as any).intangibleAssetIds) {
          const s = String(v ?? '').trim();
          if (s) ids.push(s);
        }
      }
      if (ids.length === 0 && Array.isArray((obj as any).assets)) {
        for (const a of (obj as any).assets) {
          // Deactivation snapshots carry the asset id under several keys.
          for (const k of [a?.id, a?.assetID, a?.intangible_asset_id]) {
            const s = String(k ?? '').trim();
            if (s) { ids.push(s); break; }
          }
        }
      }
    }
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

/**
 * Intangible ids HR-deactivated for each owner (approved
 * `intangible_deactivation_forms`). Used to distinguish a truly deactivated
 * intangible from one merely held `Inactive` while its accountability form
 * awaits the IT/Admin copy signature. Fail-open: on any error the map is
 * empty (callers keep the snapshot as-is).
 */
export async function getDeactivatedIntangibleIdsForUsers(
  userIds: string[]
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const uniq = [...new Set((userIds ?? []).map(u => String(u ?? '').trim()).filter(Boolean))];
  if (uniq.length === 0) return out;
  try {
    const [rows] = (await pool.execute(
      `SELECT user_id, assets_data FROM intangible_deactivation_forms
        WHERE user_id IN (${uniq.map(() => '?').join(',')})
          AND status = 'Approved' AND deleted_at IS NULL`,
      uniq
    )) as any[];
    for (const row of (rows as any[]) ?? []) {
      const uid = String((row as any)?.user_id ?? '').trim();
      if (!uid) continue;
      const ids = parseDeactivationAssetsData((row as any)?.assets_data);
      if (!ids.length) continue;
      const set = out.get(uid) ?? new Set<string>();
      for (const id of ids) set.add(id);
      out.set(uid, set);
    }
  } catch {
    /* fail-open: return whatever was collected (possibly empty) */
  }
  return out;
}

function parseRawAssetsData(raw: unknown): { parsed: any; assets: any[] | null } {
  const parsed = Buffer.isBuffer(raw)
    ? JSON.parse((raw as Buffer).toString('utf8'))
    : typeof raw === 'string'
      ? JSON.parse(raw)
      : raw;
  const assets = parsed && typeof parsed === 'object' && Array.isArray((parsed as any).assets)
    ? (parsed as any).assets
    : null;
  return { parsed, assets };
}

/**
 * Batch version for list endpoints. Rows must carry `user_id` + `assets_data`.
 * Forms left with zero assets are hidden (caller decides; the detail endpoint
 * instead returns the pruned, possibly empty, list).
 *
 * Exception: forms still awaiting the IT/Admin copy signature
 * (`approval_status = 'pending_admin_copy_signature'`) keep intangibles that
 * are merely held as `Inactive` until the copy is signed — pruning them would
 * hide an intangible-only form from the copy signer's approvals queue
 * entirely. Intangibles HR-deactivated via an approved deactivation form are
 * still pruned even in that state, so a replacement form created after HR
 * approval never shows the deactivated asset in its card or PDF.
 */
export async function stripInactiveIntangiblesFromForms(rows: any[]): Promise<any[]> {
  try {
    if (!rows.length) return rows;
    const userIds = [...new Set(rows.map(r => String(r.user_id ?? '')).filter(Boolean))];
    const activeByUser = new Map<string, Set<string> | undefined>();
    for (const uid of userIds) {
      activeByUser.set(uid, await getActiveIntangibleIdsForUser(uid));
    }
    // Deactivated-id sets are needed for ALL rows, not just pending-copy rows:
    // a replacement form created after HR approval lands in
    // `pending_admin_copy_signature` and would otherwise re-receive the
    // deactivated intangible via the held-`Inactive` exception. Prune
    // HR-deactivated ids regardless of approval_status; keep the held-`Inactive`
    // exception only for intangibles with no approved deactivation.
    let deadByUser = await getDeactivatedIntangibleIdsForUsers(userIds);
    const out: any[] = [];
    for (const row of rows) {
      try {
        const { parsed, assets } = parseRawAssetsData((row as any).assets_data);
        if (!assets) { out.push(row); continue; }
        // Prune HR-deactivated intangibles first (regardless of approval_status).
        // This removes assets that were deactivated via an approved deactivation
        // form, including replacement forms that landed in
        // pending_admin_copy_signature. The held-Inactive exception below only
        // applies to intangibles with no approved deactivation.
        const dead = deadByUser.get(String((row as any).user_id ?? ''));
        let filtered = dead && dead.size > 0
          ? pruneDeactivatedIntangibles(assets, dead)
          : assets;
        // Then prune intangibles whose assignments are no longer Active.
        // For pending_admin_copy_signature forms, skip this step so held-Inactive
        // intangibles (no approved deactivation) remain visible to the copy signer.
        if (String((row as any).approval_status ?? '') !== 'pending_admin_copy_signature') {
          const active = activeByUser.get(String((row as any).user_id ?? ''));
          filtered = pruneInactiveIntangibleAssets(filtered, active);
        }
        if (!filtered.length) continue;
        if (filtered.length === assets.length) { out.push(row); continue; }
        const next = { ...parsed, assets: filtered };
        const raw = (row as any).assets_data;
        out.push({
          ...row,
          assets_data:
            typeof raw === 'object' && raw !== null && !Buffer.isBuffer(raw) ? next : JSON.stringify(next),
        });
      } catch {
        out.push(row);
      }
    }
    return out;
  } catch {
    return rows;
  }
}
