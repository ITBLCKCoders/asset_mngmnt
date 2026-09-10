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
 */
export async function stripInactiveIntangiblesFromForms(rows: any[]): Promise<any[]> {
  try {
    if (!rows.length) return rows;
    const userIds = [...new Set(rows.map(r => String(r.user_id ?? '')).filter(Boolean))];
    const activeByUser = new Map<string, Set<string> | undefined>();
    for (const uid of userIds) {
      activeByUser.set(uid, await getActiveIntangibleIdsForUser(uid));
    }
    const out: any[] = [];
    for (const row of rows) {
      try {
        const { parsed, assets } = parseRawAssetsData((row as any).assets_data);
        if (!assets) { out.push(row); continue; }
        const active = activeByUser.get(String((row as any).user_id ?? ''));
        const filtered = pruneInactiveIntangibleAssets(assets, active);
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
