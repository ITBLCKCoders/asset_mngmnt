/**
 * Backfill `asset_return_forms.process_signed_by` from audit logs.
 *
 * Before the `process_signed_by` column existed, the user who process-signed a
 * return form was never stored. This script reconstructs that identity from
 * audit log entries with action `Processed Asset Return Form (Processor)` and
 * resource_type `asset_return_form`, and stamps `process_signed_by` on forms
 * that do not yet have a value.
 *
 * Usage:
 *   npm run db:backfill-return-processor --workspace=server
 *   npm run db:backfill-return-processor --workspace=server -- --dry-run
 *
 * WARNING: Modifies return form data. Back up the database first.
 */
import { pool } from '../db.js';
import logger from '../logger.js';

const dryRun = process.argv.includes('--dry-run');

type AuditRow = {
  user_id: string;
  resource_id: string;
  created_at: string | null;
};

type FormRow = {
  formID: string;
  form_number: string | null;
  process_signed_by: string | null;
};

type TransferLinkedFormRow = {
  formID: string;
  form_number: string | null;
  user_id: string | null;
  transfer_created_by: string | null;
  transfer_process_signed_at: string | null;
  transfer_dept_head_signed_by: string | null;
};

async function loadProcessorAuditRows(): Promise<AuditRow[]> {
  // Prefer the most recent processing audit entry per form.
  const [rows] = await pool.execute(
    `SELECT al.user_id, al.resource_id, MAX(al.created_at) AS created_at
     FROM audit_logs al
     WHERE al.action = 'Processed Asset Return Form (Processor)'
       AND al.resource_type = 'asset_return_form'
       AND al.user_id IS NOT NULL
       AND al.resource_id IS NOT NULL
       AND al.deleted_at IS NULL
     GROUP BY al.user_id, al.resource_id`
  );
  return rows as AuditRow[];
}

async function loadPendingForms(): Promise<FormRow[]> {
  const [rows] = await pool.execute(
    `SELECT formID, form_number, process_signed_by
     FROM asset_return_forms
     WHERE deleted_at IS NULL
       AND process_signed_by IS NULL`
  );
  return rows as FormRow[];
}

/**
 * Load transfer-linked return forms that were process-signed but never stamped
 * with a processor. The actual processor is the linked transfer's `created_by`
 * ONLY for processor-initiated flows — i.e. the transfer creator differs from
 * the returner (`user_id`) AND the transfer never went through dept-head
 * approval (which would mean the creator was the requestor's dept head, not the
 * processor). Transfer-request flows where the returner or dept head submitted
 * the form keep an empty processor.
 */
async function loadTransferLinkedForms(): Promise<TransferLinkedFormRow[]> {
  const [rows] = await pool.execute(
    `SELECT arf.formID, arf.form_number, arf.user_id,
            atf.created_by AS transfer_created_by,
            atf.process_signed_at AS transfer_process_signed_at,
            atf.dept_head_signed_by AS transfer_dept_head_signed_by
     FROM asset_return_forms arf
     JOIN asset_transfer_forms atf ON atf.return_form_id = arf.formID AND atf.deleted_at IS NULL
     WHERE arf.deleted_at IS NULL
       AND arf.process_signed_by IS NULL
       AND arf.process_signed_at IS NOT NULL`
  );
  return rows as TransferLinkedFormRow[];
}

async function backfillTransferProcessors(): Promise<void> {
  logger.info(
    `Transfer-linked return processor backfill (dry-run: ${dryRun})`
  );

  const connection = await pool.getConnection();
  try {
    const rows = await loadTransferLinkedForms();
    logger.info(
      `Transfer-linked forms without process_signed_by: ${rows.length}`
    );

    const matches = rows.filter(
      (r) =>
        r.transfer_created_by &&
        r.user_id &&
        r.transfer_created_by !== r.user_id &&
        r.transfer_process_signed_at &&
        !r.transfer_dept_head_signed_by
    );
    logger.info(`Forms to update: ${matches.length}`);
    for (const m of matches.slice(0, 10)) {
      logger.info(
        `  ${m.form_number ?? m.formID} -> processor ${m.transfer_created_by}`
      );
    }
    if (matches.length > 10) {
      logger.info(`  ... and ${matches.length - 10} more`);
    }

    if (dryRun) {
      logger.info(
        'Dry run — would stamp process_signed_by on matching transfer-linked forms.'
      );
      return;
    }

    await connection.beginTransaction();
    let updated = 0;
    for (const m of matches) {
      const [result] = await connection.execute(
        `UPDATE asset_return_forms
         SET process_signed_by = ?, updated_at = NOW()
         WHERE formID = ? AND process_signed_by IS NULL`,
        [m.transfer_created_by, m.formID]
      );
      updated += (result as { affectedRows?: number }).affectedRows ?? 0;
    }
    await connection.commit();

    logger.info(`Updated ${updated} transfer-linked asset return form(s).`);
  } catch (error) {
    await connection.rollback();
    logger.error('Transfer-linked return processor backfill failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function backfillReturnProcessors(): Promise<void> {
  logger.info(
    `Return processor backfill from audit logs (dry-run: ${dryRun})`
  );

  const connection = await pool.getConnection();
  try {
    const auditRows = await loadProcessorAuditRows();
    logger.info(`Audit log processor entries: ${auditRows.length}`);

    if (auditRows.length === 0) {
      logger.info('Nothing to backfill from audit logs.');
      return;
    }

    const pendingForms = await loadPendingForms();
    logger.info(`Forms without process_signed_by: ${pendingForms.length}`);

    const pendingByFormId = new Map<string, FormRow>();
    for (const form of pendingForms) {
      pendingByFormId.set(form.formID, form);
    }

    const matches: { formID: string; user_id: string; form_number: string | null }[] = [];
    const seen = new Set<string>();
    for (const row of auditRows) {
      const form = pendingByFormId.get(row.resource_id);
      if (!form) continue;
      if (seen.has(form.formID)) continue;
      seen.add(form.formID);
      matches.push({
        formID: form.formID,
        user_id: row.user_id,
        form_number: form.form_number,
      });
    }

    logger.info(`Forms to update: ${matches.length}`);
    for (const m of matches.slice(0, 10)) {
      logger.info(`  ${m.form_number ?? m.formID} -> processor ${m.user_id}`);
    }
    if (matches.length > 10) {
      logger.info(`  ... and ${matches.length - 10} more`);
    }

    if (dryRun) {
      logger.info('Dry run — would stamp process_signed_by on matching forms.');
      return;
    }

    await connection.beginTransaction();
    let updated = 0;
    for (const m of matches) {
      const [result] = await connection.execute(
        `UPDATE asset_return_forms
         SET process_signed_by = ?, updated_at = NOW()
         WHERE formID = ? AND process_signed_by IS NULL`,
        [m.user_id, m.formID]
      );
      updated += (result as { affectedRows?: number }).affectedRows ?? 0;
    }
    await connection.commit();

    logger.info(`Updated ${updated} asset return form(s).`);
  } catch (error) {
    await connection.rollback();
    logger.error('Return processor backfill failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function main(): Promise<void> {
  await backfillReturnProcessors();
  await backfillTransferProcessors();
  console.log(
    dryRun
      ? 'Dry run completed. Re-run without --dry-run to apply updates.'
      : 'Return processor backfill completed successfully.'
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Return processor backfill failed:', err);
    process.exit(1);
  });