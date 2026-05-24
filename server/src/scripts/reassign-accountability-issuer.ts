/**
 * Reassign accountability form "Issued by" / IT copy issuer to a target user and
 * stamp issuer + IT copy signatures from that user's digital_signature profile.
 *
 * Updates per row:
 *   - created_by          → target user (shown as "Issued by" in UI/PDF)
 *   - issuer_signature    → target user's digital_signature
 *   - it_copy_signature   → target user's digital_signature
 *
 * Schema reference: dblive3v10-11-5-24-26
 *
 * WARNING: Modifies production accountability data. Back up the database first.
 *
 * Default target: Michael Castro (IT Support)
 *   userID: 476e06e6-2f5f-46d0-8292-5fde561a37b4
 *
 * Scope: only forms whose assignee (issued-to user) belongs to Black Coders Group Inc.
 *   companyID: 21a225aa-cdbc-11f0-acd5-047c16a24f9f
 *
 * Usage:
 *   npm run db:reassign-accountability-issuer --workspace=server
 *   npm run db:reassign-accountability-issuer --workspace=server -- --dry-run
 *
 * Environment (optional):
 *   ACCOUNTABILITY_ISSUER_USER_ID=<uuid>       Target issuer (default: Michael Castro)
 *   ACCOUNTABILITY_ISSUER_COMPANY_ID=<uuid>     Issued-to company filter (default: BCGI)
 *   ACCOUNTABILITY_ISSUER_FROM_USER_ID=<uuid>  Only forms currently issued by this user
 *   ACCOUNTABILITY_ISSUER_FORM_IDS=id1,id2     Comma-separated formID list (still scoped by company)
 */
import { pool } from '../db.js';
import logger from '../logger.js';

const DEFAULT_TARGET_USER_ID = '476e06e6-2f5f-46d0-8292-5fde561a37b4';
const DEFAULT_ISSUED_TO_COMPANY_ID = '21a225aa-cdbc-11f0-acd5-047c16a24f9f';

const targetUserId =
  process.env.ACCOUNTABILITY_ISSUER_USER_ID?.trim() || DEFAULT_TARGET_USER_ID;
const issuedToCompanyId =
  process.env.ACCOUNTABILITY_ISSUER_COMPANY_ID?.trim() ||
  DEFAULT_ISSUED_TO_COMPANY_ID;
const fromUserId = process.env.ACCOUNTABILITY_ISSUER_FROM_USER_ID?.trim() || '';
const formIdsRaw = process.env.ACCOUNTABILITY_ISSUER_FORM_IDS?.trim() || '';
const formIds = formIdsRaw
  ? formIdsRaw.split(',').map(id => id.trim()).filter(Boolean)
  : [];

const dryRun = process.argv.includes('--dry-run');

type UserRow = {
  userID: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  digital_signature: string | null;
};

type CountRow = { count: number };

type PreviewRow = {
  formID: string;
  form_number: string;
  created_by: string | null;
  status: string;
  user_id: string;
};

type CompanyRow = {
  companyID: string;
  name: string | null;
};

function buildWhereClause(): { sql: string; params: string[] } {
  const clauses = [
    'af.deleted_at IS NULL',
    'af.user_id IN (SELECT userID FROM users WHERE company_id = ?)',
  ];
  const params: string[] = [issuedToCompanyId];

  if (formIds.length > 0) {
    clauses.push(`af.formID IN (${formIds.map(() => '?').join(', ')})`);
    params.push(...formIds);
  } else if (fromUserId) {
    clauses.push('af.created_by = ?');
    params.push(fromUserId);
  }

  return { sql: clauses.join(' AND '), params };
}

async function loadCompany(
  connection: Awaited<ReturnType<typeof pool.getConnection>>
): Promise<CompanyRow> {
  const [rows] = await connection.execute(
    `SELECT companyID, name FROM companies WHERE companyID = ? AND deleted_at IS NULL LIMIT 1`,
    [issuedToCompanyId]
  );
  const company = (rows as CompanyRow[])[0];
  if (!company) {
    throw new Error(`Issued-to company not found: ${issuedToCompanyId}`);
  }
  return company;
}

async function loadTargetUser(
  connection: Awaited<ReturnType<typeof pool.getConnection>>
): Promise<UserRow> {
  const [rows] = await connection.execute(
    `SELECT userID, email, first_name, last_name, digital_signature
     FROM users WHERE userID = ? LIMIT 1`,
    [targetUserId]
  );
  const user = (rows as UserRow[])[0];
  if (!user) {
    throw new Error(`Target user not found: ${targetUserId}`);
  }
  return user;
}

async function countForms(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  where: { sql: string; params: string[] }
): Promise<number> {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM accountability_forms af
     WHERE ${where.sql}`,
    where.params
  );
  return Number((rows as CountRow[])[0]?.count ?? 0);
}

async function previewForms(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  where: { sql: string; params: string[] },
  limit = 10
): Promise<PreviewRow[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const [rows] = await connection.execute(
    `SELECT af.formID, af.form_number, af.created_by, af.status, af.user_id
     FROM accountability_forms af
     WHERE ${where.sql}
     ORDER BY af.created_at DESC
     LIMIT ${safeLimit}`,
    where.params
  );
  return rows as PreviewRow[];
}

async function reassignAccountabilityIssuer(): Promise<void> {
  logger.info(
    `Accountability issuer reassignment (target: ${targetUserId}, dry-run: ${dryRun})`
  );
  if (fromUserId) {
    logger.info(`Filter: only forms where created_by = ${fromUserId}`);
  }
  if (formIds.length > 0) {
    logger.info(`Filter: form IDs (${formIds.length}): ${formIds.join(', ')}`);
  }

  const connection = await pool.getConnection();
  try {
    const company = await loadCompany(connection);
    logger.info(
      `Scope: issued-to users in company ${company.name ?? company.companyID} (${company.companyID})`
    );

    const targetUser = await loadTargetUser(connection);
    const displayName = `${targetUser.first_name ?? ''} ${targetUser.last_name ?? ''}`.trim();
    logger.info(
      `Target: ${displayName || targetUser.email} <${targetUser.email}> (${targetUser.userID})`
    );

    const signature = targetUser.digital_signature?.trim() ?? '';
    if (!signature) {
      throw new Error(
        `Target user has no digital_signature in users.digital_signature. ` +
          `Add initials in profile for ${targetUser.email} before running this script.`
      );
    }

    const where = buildWhereClause();
    const total = await countForms(connection, where);
    logger.info(`Forms matching filter: ${total}`);

    if (total === 0) {
      logger.info('Nothing to update.');
      return;
    }

    const sample = await previewForms(connection, where);
    logger.info('Sample forms (up to 10):');
    for (const row of sample) {
      logger.info(
        `  ${row.form_number} (${row.formID}) status=${row.status} issued_to=${row.user_id} created_by=${row.created_by ?? 'NULL'}`
      );
    }

    if (dryRun) {
      logger.info(
        'Dry run — would set created_by, issuer_signature, and it_copy_signature on matching rows.'
      );
      return;
    }

    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE accountability_forms af
       SET af.created_by = ?,
           af.issuer_signature = ?,
           af.it_copy_signature = ?,
           af.updated_at = NOW()
       WHERE ${where.sql}`,
      [targetUserId, signature, signature, ...where.params]
    );

    const updated = (result as { affectedRows?: number }).affectedRows ?? 0;
    await connection.commit();

    logger.info(`Updated ${updated} accountability form(s).`);
    logger.info(
      `Issuer display name on forms/PDF: ${displayName || targetUser.email}`
    );
  } catch (error) {
    await connection.rollback();
    logger.error('Accountability issuer reassignment failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

reassignAccountabilityIssuer()
  .then(() => {
    console.log(
      dryRun
        ? 'Dry run completed. Re-run without --dry-run to apply updates.'
        : 'Accountability issuer reassignment completed successfully.'
    );
    process.exit(0);
  })
  .catch(err => {
    console.error('Accountability issuer reassignment failed:', err);
    process.exit(1);
  });
