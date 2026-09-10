/**
 * Prune deactivated intangible entries from accountability form snapshots.
 *
 * Context: HR-approved intangible deactivations used to regenerate replacement
 * accountability forms that still contained the deactivated intangible
 * (e.g. old form 005-108-1021-092026-0090 Disabled, replacement
 * 005-108-1021-092026-0091 still listed "Dummy Intagible, Training Agreement
 * Signatory"). The regen path is fixed going forward; this script repairs
 * forms already created with the stale snapshot — including ones already
 * signed/approved in the approvals page.
 *
 * What it does per accountability form (deleted_at IS NULL):
 *   1. Parses assets_data.assets (+ top-level intangibleAssetIds when present).
 *   2. For each Intangible entry, checks intangible_asset_assignments for the
 *      form owner (user_id):
 *        - Active row exists  -> keep
 *        - only Inactive row(s) exist (deactivated/returned) -> prune
 *        - no row at all (legacy/transferred) -> keep (never touch history
 *          we cannot prove stale)
 *   3. Gap-fills kept Intangible entries that are missing display fields the
 *      PDF renders (risk_level, type_department, description) from the live
 *      intangible_assets / risk_levels tables. Only fills missing fields —
 *      never overwrites snapshot values. This repairs replacement forms that
 *      were generated before the regen path embedded risk levels.
 *   4. Rewrites assets_data with the dead entries removed and gaps filled
 *      (all other keys preserved), writes an audit log. Statuses and
 *      signatures untouched.
 *   5. Skips Disabled forms and forms left with zero assets (reported, not
 *      auto-disabled — decide those manually).
 *
 * Usage:
 *   npm run db:backfill-prune-deactivated-intangibles --workspace=server -- --dry-run
 *   npm run db:backfill-prune-deactivated-intangibles --workspace=server -- --dry-run --form-numbers=005-108-1021-092026-0091
 *   npm run db:backfill-prune-deactivated-intangibles --workspace=server -- --form-numbers=005-108-1021-092026-0091
 *   npm run db:backfill-prune-deactivated-intangibles --workspace=server -- --user-id=<userID>
 *
 * WARNING: Modifies accountability form snapshots. Back up the database first.
 */
import { pool } from '../db.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function argValue(name: string): string {
  const hit = args.find(a => a === name || a.startsWith(`${name}=`));
  if (!hit) return '';
  const eq = hit.indexOf('=');
  return eq === -1 ? '' : hit.slice(eq + 1).trim();
}

const formNumbers = argValue('--form-numbers')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const onlyUserId = argValue('--user-id');
const actorUserId = process.env.BACKFILL_ACTOR_USER_ID?.trim() || '';

type FormRow = {
  formID: string;
  form_number: string | null;
  user_id: string | null;
  status: string | null;
  approval_status: string | null;
  assets_data: unknown;
};

function parseAssetsData(raw: unknown): { obj: Record<string, any>; assets: any[] } | null {
  try {
    const parsed = Buffer.isBuffer(raw)
      ? JSON.parse(raw.toString('utf8'))
      : typeof raw === 'string'
        ? JSON.parse(raw)
        : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    const assets = Array.isArray((parsed as any).assets) ? (parsed as any).assets : [];
    return { obj: parsed as Record<string, any>, assets };
  } catch {
    return null;
  }
}

function intangibleKeysOf(entry: any): string[] {
  return [
    String(entry?.id ?? '').trim(),
    String(entry?.intangible_asset_id ?? '').trim(),
    String(entry?.assetID ?? '').trim(),
  ].filter(Boolean);
}

async function loadForms(): Promise<FormRow[]> {
  const clauses = ['deleted_at IS NULL', `status IN ('Pending', 'Signed')`];
  const params: string[] = [];
  if (formNumbers.length) {
    clauses.push(`form_number IN (${formNumbers.map(() => '?').join(', ')})`);
    params.push(...formNumbers);
  }
  if (onlyUserId) {
    clauses.push('user_id = ?');
    params.push(onlyUserId);
  }
  const [rows] = await pool.execute(
    `SELECT formID, form_number, user_id, status, approval_status, assets_data
       FROM accountability_forms
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC`,
    params
  );
  return rows as FormRow[];
}

async function partitionIntangibleIds(
  userId: string,
  ids: string[]
): Promise<{ dead: Set<string>; live: Set<string> }> {
  const uniq = [...new Set(ids.map(s => s.trim()).filter(Boolean))];
  const dead = new Set<string>();
  const live = new Set<string>();
  if (!uniq.length) return { dead, live };
  const placeholders = uniq.map(() => '?').join(', ');
  // Any Active row keeps the entry. Only entries whose rows are all
  // non-Active (Inactive) are treated as deactivated. Entries with no
  // assignment row at all are left alone (legacy / transferred history).
  const [rows] = (await pool.execute(
    `SELECT intangible_asset_id,
            MAX(CASE WHEN status = 'Active' AND deleted_at IS NULL THEN 1 ELSE 0 END) AS has_active,
            COUNT(*) AS row_count
       FROM intangible_asset_assignments
      WHERE user_id = ? AND intangible_asset_id IN (${placeholders})
      GROUP BY intangible_asset_id`,
    [userId, ...uniq]
  )) as any[];
  const byId = new Map<string, { has_active: number }>(
    (rows as any[]).map(r => [String(r.intangible_asset_id).trim(), { has_active: Number(r.has_active ?? 0) }])
  );
  for (const id of uniq) {
    const hit = byId.get(id);
    if (!hit) continue; // no row -> keep, do not rewrite history we can't prove
    if (hit.has_active === 1) live.add(id);
    else dead.add(id);
  }
  return { dead, live };
}

type IntangibleMetaRow = {
  id: string;
  description: string | null;
  type: string | null;
  risk_level_id: string | null;
  rl_id: string | null;
  rl_name: string | null;
  rl_color: string | null;
  td_id: string | null;
  td_name: string | null;
  td_code: string | null;
};

/** Live display metadata for gap-filling entries that predate risk embedding. */
async function loadIntangibleMeta(ids: string[]): Promise<Map<string, IntangibleMetaRow>> {
  const uniq = [...new Set(ids.map(s => s.trim()).filter(Boolean))];
  const out = new Map<string, IntangibleMetaRow>();
  if (!uniq.length) return out;
  const placeholders = uniq.map(() => '?').join(', ');
  const [rows] = (await pool.execute(
    `SELECT ia.id, ia.description, ia.type, ia.risk_level_id,
            rl.id AS rl_id, rl.name AS rl_name, rl.color AS rl_color,
            td.departmentID AS td_id, td.name AS td_name, td.code AS td_code
       FROM intangible_assets ia
       LEFT JOIN risk_levels rl ON ia.risk_level_id = rl.id AND rl.deleted_at IS NULL
       LEFT JOIN intangible_asset_types iat
         ON ia.type = iat.name AND iat.company_id = ia.company_id AND iat.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_departments td
         ON iat.department_id = td.departmentID AND td.deleted_at IS NULL
      WHERE ia.id IN (${placeholders})`,
    uniq
  )) as any[];
  for (const r of rows as any[]) out.set(String(r.id).trim(), r as IntangibleMetaRow);
  return out;
}

/**
 * Fill missing display fields on kept entries. Returns the number of entries
 * touched. Never overwrites values the snapshot already has.
 */
function gapFillKeptEntries(assets: any[], meta: Map<string, IntangibleMetaRow>): number {
  let touched = 0;
  for (const a of assets) {
    if (String(a?.category ?? '') !== 'Intangible') continue;
    const keys = intangibleKeysOf(a);
    const row = keys.map(k => meta.get(k)).find(Boolean);
    if (!row) continue;
    let changed = false;
    if (!String(a?.description ?? '').trim() && row.description) {
      a.description = row.description;
      changed = true;
    }
    if (!a?.type && row.type) {
      a.type = row.type;
      changed = true;
    }
    const riskId = String(a?.risk_level?.id ?? a?.risk_level_id ?? '').trim();
    if (!riskId && (row.risk_level_id || row.rl_id || row.rl_name)) {
      a.risk_level_id = row.risk_level_id ?? row.rl_id ?? null;
      a.risk_level = {
        id: row.risk_level_id ?? row.rl_id ?? null,
        name: row.rl_name ?? null,
        ...(row.rl_color ? { color: row.rl_color } : {}),
      };
      changed = true;
    }
    const hasTypeDept =
      a?.type_department != null || String(a?.type_department_name ?? '').trim() !== '';
    if (!hasTypeDept && (row.td_id || row.td_name)) {
      a.type_department = {
        id: row.td_id ?? null,
        name: row.td_name ?? null,
        ...(row.td_code ? { code: row.td_code } : {}),
      };
      a.type_department_name = row.td_name ?? null;
      changed = true;
    }
    if (changed) touched += 1;
  }
  return touched;
}

async function main(): Promise<void> {
  logger.info(
    `Prune-deactivated-intangibles backfill (dry-run: ${dryRun}, forms: ${formNumbers.length || 'all'}, user: ${onlyUserId || 'all'})`
  );
  const forms = await loadForms();
  logger.info(`Candidate forms (Pending/Signed): ${forms.length}`);

  let affected = 0;
  let prunedTotal = 0;
  let filledTotal = 0;
  const emptied: string[] = [];

  for (const form of forms) {
    if (!form.user_id) continue;
    const parsed = parseAssetsData(form.assets_data);
    if (!parsed || !parsed.assets.length) continue;

    const intangibleEntries = parsed.assets.filter(
      (a: any) => String(a?.category ?? '') === 'Intangible'
    );
    if (!intangibleEntries.length) continue;

    const candidateIds = intangibleEntries.flatMap(intangibleKeysOf);
    const topLevel: unknown[] = Array.isArray((parsed.obj as any)?.intangibleAssetIds)
      ? (parsed.obj as any).intangibleAssetIds
      : [];
    for (const v of topLevel) {
      const s = String(v ?? '').trim();
      if (s) candidateIds.push(s);
    }

    const { dead } = await partitionIntangibleIds(String(form.user_id), candidateIds);

    const before = parsed.assets.length;
    const afterAssets = parsed.assets.filter((a: any) => {
      if (String(a?.category ?? '') !== 'Intangible') return true;
      const keys = intangibleKeysOf(a);
      if (!keys.length) return true;
      return !keys.some(k => dead.has(k));
    });
    const removed = before - afterAssets.length;

    const next: Record<string, any> = { ...parsed.obj, assets: afterAssets };
    if (Array.isArray(next.intangibleAssetIds)) {
      next.intangibleAssetIds = (next.intangibleAssetIds as unknown[])
        .map(v => String(v ?? '').trim())
        .filter(v => v && !dead.has(v));
    }

    // Gap-fill display fields on the kept entries (risk_level etc. missing on
    // forms generated before the regen path embedded them).
    const keptIds = afterAssets.flatMap((a: any) =>
      String(a?.category ?? '') === 'Intangible' ? intangibleKeysOf(a) : []
    );
    const meta = await loadIntangibleMeta(keptIds);
    const gapFilled = gapFillKeptEntries(afterAssets, meta);

    if (!removed && !gapFilled) continue;

    affected += 1;
    prunedTotal += removed;
    filledTotal += gapFilled;
    logger.info(
      `  ${form.form_number ?? form.formID} [${form.status}/${form.approval_status}] user ${form.user_id}: prune ${removed}${removed ? ` -> [${[...dead].join(', ')}]` : ''}, gap-fill ${gapFilled} (${before} to ${afterAssets.length} assets)`
    );

    if (!afterAssets.length) {
      emptied.push(form.form_number ?? form.formID);
      logger.warn(
        `  ${form.form_number ?? form.formID} would be left with zero assets — skipped (decide manually: disable or issue clearance).`
      );
      continue;
    }

    if (dryRun) continue;

    const raw = form.assets_data;
    const nextJson = JSON.stringify(next);
    await pool.execute(
      `UPDATE accountability_forms SET assets_data = ?, updated_at = NOW() WHERE formID = ? AND deleted_at IS NULL`,
      [
        typeof raw === 'object' && raw !== null && !Buffer.isBuffer(raw) ? next : nextJson,
        form.formID,
      ]
    );
    try {
      await createAuditLog({
        userId: actorUserId || undefined,
        action: 'Backfill: Pruned Deactivated Intangible',
        resourceType: 'accountability_form',
        resourceId: form.formID,
        resourceName: form.form_number ?? form.formID,
        details: `Removed ${removed} deactivated intangible(s)${removed ? `: ${[...dead].join(', ')}` : ''}; gap-filled ${gapFilled} entr(ies) with live risk/type metadata`,
        oldValues: { asset_count: before },
        newValues: { asset_count: afterAssets.length },
        userAgent: 'backfill-prune-deactivated-intangibles',
      });
    } catch (e) {
      logger.warn(`  audit log failed for ${form.form_number ?? form.formID}`, e as any);
    }
  }

  logger.info(`Forms affected: ${affected}, entries pruned: ${prunedTotal}, entries gap-filled: ${filledTotal}`);
  if (emptied.length) {
    logger.warn(`Forms that would empty out (skipped): ${emptied.join(', ')}`);
  }
  console.log(
    dryRun
      ? `Dry run completed: ${affected} form(s), ${prunedTotal} pruned, ${filledTotal} gap-filled. Re-run without --dry-run to apply.`
      : `Backfill completed: ${affected} form(s), ${prunedTotal} pruned, ${filledTotal} gap-filled.`
  );
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Prune-deactivated-intangibles backfill failed:', err);
    process.exit(1);
  });
