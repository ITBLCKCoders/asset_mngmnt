# Database Migrations

This document describes the migration strategy for the asset management database.

## Two Migration Mechanisms

### 1. MigrationManager (SQL files in `db/`)

**Location:** `db/*.sql`  
**Runner:** `server/src/migration/MigrationManager.ts`  
**When:** Migrations are run programmatically when the MigrationManager is invoked (e.g. via an API or startup hook).

**Use for:**

- Schema changes (new tables, columns, indexes)
- Stored procedure updates
- Any migration that should be tracked and replayable

**Naming:** `migration_<description>.sql` (e.g. `migration_add_received_copy_signed_by_name.sql`)

### 2. Standalone scripts (JS files in `server/scripts/`)

**Location:** `server/scripts/*.js`  
**Runner:** Run manually via `cd server && node scripts/<script-name>.js`  
**When:** One-off schema changes or backfills that were added after the MigrationManager was set up, or operations that need to run outside the app lifecycle.

**Available scripts:**

- `run-received-copy-migration.js` – Add `received_copy_201_file_signature` column
- `run-received-copy-signed-by-migration.js` – Add `received_copy_201_file_signed_at` and `received_copy_201_file_signed_by` columns
- `run-received-copy-signed-by-name-migration.js` – Add `received_copy_201_file_signed_by_name` column
- `backfill-received-copy-signer-names.js` – Backfill signer names for existing signed forms
- `run-received-copy-wet-pdf-url-migration.js` – Add `received_copy_wet_pdf_url` column

**SQL files (MigrationManager / manual):**

- `migration_add_received_copy_wet_pdf_url.sql` – Add `received_copy_wet_pdf_url` for HR wet-signed PDF storage (Cloudinary URL)

**Use for:**

- One-off column additions that predate MigrationManager integration
- Data backfills (e.g. populating a new column from existing data)
- Migrations that must run before the app starts and are not yet in MigrationManager

**Shared runner:** All scripts use `scripts/migration-runner.js`, which handles pool creation and error handling.

## Overlap: SQL files vs JS scripts

For the received-copy columns, both SQL files and JS scripts exist:

- `db/migration_add_received_copy_201_file_signature.sql`
- `db/migration_add_received_copy_signed_by_name.sql`
- `server/scripts/run-received-copy-*.js`

**Recommendation:** Use **one** mechanism per migration:

- If using MigrationManager: add/update the SQL file and run via MigrationManager.
- If using standalone scripts: run the JS script and do not duplicate in SQL files.

For future migrations, prefer adding SQL files to `db/` and wiring them into MigrationManager for consistency and auditability.
