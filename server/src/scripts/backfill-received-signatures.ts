/**
 * Backfill missing digital signatures on transfer & return forms.
 *
 * When a signature step completed before the signing user had a profile
 * signature (or the value failed to persist), the *_digital_signature column
 * is empty while the signed_at / signed_by columns are set. This script stamps
 * the missing signature from the signing user's current profile signature
 * (`users.digital_signature`).
 *
 * Covers: transferrer, processor, dept head, sub approver 1/2, IT manager.
 * (Processor on transfer forms is attributed to `created_by`, matching the
 * existing batch-display fallback in `resolveProcessorSignatureForBatchDisplay`.)
 *
 * Usage:
 *   npm run db:backfill-received-signatures --workspace=server
 *   npm run db:backfill-received-signatures --workspace=server -- --dry-run
 *
 * WARNING: Modifies form data. Back up the database first.
 */
import { pool } from '../db.js';
import logger from '../logger.js';

const dryRun = process.argv.includes('--dry-run');

type SignatureTarget = {
  table: 'asset_transfer_forms' | 'asset_return_forms';
  role: string;
  signed_at_col: string;
  signed_by_col: string;
  signature_col: string;
  /** When set, skip rows where this column already holds a value (e.g. a pending processor signature). */
  exclude_when_set_col?: string;
};

const TARGETS: SignatureTarget[] = [
  // Transfer forms
  {
    table: 'asset_transfer_forms',
    role: 'transferrer',
    signed_at_col: 'signed_at',
    signed_by_col: 'signed_by',
    signature_col: 'signed_digital_signature',
  },
  {
    table: 'asset_transfer_forms',
    role: 'processor',
    signed_at_col: 'process_signed_at',
    signed_by_col: 'created_by',
    signature_col: 'process_digital_signature',
    exclude_when_set_col: 'processor_pending_signature',
  },
  {
    table: 'asset_transfer_forms',
    role: 'dept_head',
    signed_at_col: 'dept_head_signed_at',
    signed_by_col: 'dept_head_signed_by',
    signature_col: 'dept_head_digital_signature',
  },
  {
    table: 'asset_transfer_forms',
    role: 'sub_approver_1',
    signed_at_col: 'sub_approver_1_signed_at',
    signed_by_col: 'sub_approver_1_signed_by',
    signature_col: 'sub_approver_1_digital_signature',
  },
  {
    table: 'asset_transfer_forms',
    role: 'it_manager',
    signed_at_col: 'it_manager_signed_at',
    signed_by_col: 'it_manager_signed_by',
    signature_col: 'it_manager_digital_signature',
  },
  {
    table: 'asset_transfer_forms',
    role: 'sub_approver_2',
    signed_at_col: 'sub_approver_2_signed_at',
    signed_by_col: 'sub_approver_2_signed_by',
    signature_col: 'sub_approver_2_digital_signature',
  },
  // Return forms
  {
    table: 'asset_return_forms',
    role: 'returner',
    signed_at_col: 'signed_at',
    signed_by_col: 'signed_by',
    signature_col: 'signed_digital_signature',
  },
  {
    table: 'asset_return_forms',
    role: 'processor',
    signed_at_col: 'process_signed_at',
    signed_by_col: 'process_signed_by',
    signature_col: 'process_digital_signature',
  },
  {
    table: 'asset_return_forms',
    role: 'dept_head',
    signed_at_col: 'dept_head_signed_at',
    signed_by_col: 'dept_head_signed_by',
    signature_col: 'dept_head_digital_signature',
  },
  {
    table: 'asset_return_forms',
    role: 'sub_approver_1',
    signed_at_col: 'sub_approver_1_signed_at',
    signed_by_col: 'sub_approver_1_signed_by',
    signature_col: 'sub_approver_1_digital_signature',
  },
  {
    table: 'asset_return_forms',
    role: 'it_manager',
    signed_at_col: 'it_manager_signed_at',
    signed_by_col: 'it_manager_signed_by',
    signature_col: 'it_manager_digital_signature',
  },
  {
    table: 'asset_return_forms',
    role: 'sub_approver_2',
    signed_at_col: 'sub_approver_2_signed_at',
    signed_by_col: 'sub_approver_2_signed_by',
    signature_col: 'sub_approver_2_digital_signature',
  },
];

type FormRow = {
  formID: string;
  form_number: string | null;
  signed_by: string | null;
};

async function loadPendingForms(
  target: SignatureTarget
): Promise<FormRow[]> {
  const excludeClause = target.exclude_when_set_col
    ? ` AND ${target.exclude_when_set_col} IS NULL`
    : '';
  const [rows] = await pool.execute(
    `SELECT formID, form_number, ${target.signed_by_col} AS signed_by
     FROM ${target.table}
     WHERE deleted_at IS NULL
       AND ${target.signed_at_col} IS NOT NULL
       AND ${target.signed_by_col} IS NOT NULL
       AND (${target.signature_col} IS NULL OR ${target.signature_col} = '')
       ${excludeClause}`
  );
  return rows as FormRow[];
}

async function loadUserSignatures(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const [rows] = await pool.execute(
    `SELECT userID, digital_signature FROM users
     WHERE userID IN (${userIds.map(() => '?').join(',')})`,
    userIds
  );
  for (const row of rows as Array<{ userID: string; digital_signature: string | null }>) {
    if (row.digital_signature && row.digital_signature.trim()) {
      map.set(row.userID, row.digital_signature);
    }
  }
  return map;
}

async function backfillTarget(target: SignatureTarget): Promise<void> {
  logger.info(
    `Backfill ${target.table}.${target.role} (dry-run: ${dryRun})`
  );

  const pending = await loadPendingForms(target);
  if (pending.length === 0) {
    logger.info('  No forms with a missing signature.');
    return;
  }

  const userIds = [...new Set(pending.map((p) => p.signed_by).filter(Boolean) as string[])];
  const signatures = await loadUserSignatures(userIds);

  const updatable = pending.filter((p) => p.signed_by && signatures.has(p.signed_by));
  const cannotBackfill = pending.filter((p) => !p.signed_by || !signatures.has(p.signed_by));

  logger.info(`  Forms to update: ${updatable.length}`);
  for (const m of updatable) {
    logger.info(
      `  ${m.form_number ?? m.formID} -> user ${m.signed_by} (${target.role})`
    );
  }
  if (cannotBackfill.length > 0) {
    logger.warn(
      `  ${cannotBackfill.length} form(s) have no signature on the user profile and cannot be backfilled:`
    );
    for (const m of cannotBackfill) {
      logger.warn(`  ${m.form_number ?? m.formID} -> user ${m.signed_by ?? 'unknown'}`);
    }
  }

  if (dryRun) {
    logger.info('  Dry run — no changes applied.');
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let updated = 0;
    for (const m of updatable) {
      const sig = signatures.get(m.signed_by as string);
      if (!sig) continue;
      const [result] = await connection.execute(
        `UPDATE ${target.table}
         SET ${target.signature_col} = ?, updated_at = NOW()
         WHERE formID = ? AND (${target.signature_col} IS NULL OR ${target.signature_col} = '')`,
        [sig, m.formID]
      );
      updated += (result as { affectedRows?: number }).affectedRows ?? 0;
    }
    await connection.commit();
    logger.info(`  Updated ${updated} form(s).`);
  } catch (error) {
    await connection.rollback();
    logger.error(`Backfill failed for ${target.table}.${target.role}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

async function main(): Promise<void> {
  for (const target of TARGETS) {
    await backfillTarget(target);
  }
  console.log(
    dryRun
      ? 'Dry run completed. Re-run without --dry-run to apply updates.'
      : 'Receiver signature backfill completed successfully.'
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Receiver signature backfill failed:', err);
    process.exit(1);
  });
