#!/usr/bin/env node
/**
 * Audit Log Archival Job
 *
 * This script archives audit logs that exceed the retention period configured
 * for each company. It can be run manually or scheduled via cron.
 *
 * Usage:
 *   node server/scripts/archive-audit-logs.js
 *
 * Cron example (run daily at 2 AM):
 *   0 2 * * * cd /path/to/project && node server/scripts/archive-audit-logs.js
 */

const { pool } = require('../src/db.js');
const { AuditRetentionService } = require('../src/services/auditRetention.service.js');

/**
 * Get all companies with active retention settings
 */
async function getCompaniesWithRetentionSettings() {
  const [rows] = await pool.execute(`
    SELECT DISTINCT company_id
    FROM audit_retention_settings
    WHERE is_active = TRUE
  `);
  return rows;
}

/**
 * Archive logs for a single company
 */
async function archiveCompanyLogs(companyId) {
  try {
    // Use a system user ID for archival operations
    const systemUserId = '00000000-0000-0000-0000-000000000000';
    const result = await AuditRetentionService.archiveOldLogs(companyId, systemUserId);
    return result;
  } catch (error) {
    console.error(`Failed to archive logs for company ${companyId}:`, error);
    return { archivedCount: 0, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Audit Log Archival Job ===');
  console.log(`Started at: ${new Date().toISOString()}`);

  try {
    const companies = await getCompaniesWithRetentionSettings();
    console.log(`Found ${companies.length} companies with active retention settings`);

    let totalArchived = 0;
    const results = [];

    for (const company of companies) {
      console.log(`Processing company: ${company.company_id}`);
      const result = await archiveCompanyLogs(company.company_id);
      totalArchived += result.archivedCount;
      results.push({
        companyId: company.company_id,
        archivedCount: result.archivedCount,
        error: result.error,
      });
      console.log(`  - Archived ${result.archivedCount} logs`);
    }

    console.log('\n=== Summary ===');
    console.log(`Total companies processed: ${companies.length}`);
    console.log(`Total logs archived: ${totalArchived}`);

    if (results.some(r => r.error)) {
      console.log('\nErrors encountered:');
      results.forEach(r => {
        if (r.error) {
          console.log(`  - ${r.companyId}: ${r.error}`);
        }
      });
      process.exit(1);
    } else {
      console.log('Archival completed successfully');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during archival job:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
