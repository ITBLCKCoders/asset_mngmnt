import type { Pool } from 'mysql2/promise';

/**
 * Lazily ensures `role_permissions` exists (same DDL as db/migration_role_permissions.sql).
 * GET role permissions swallows ER_NO_SUCH_TABLE; PUT must not fail on fresh DBs that skipped the migration.
 */
let ensurePromise: Promise<void> | null = null;

const ROLE_PERMISSIONS_DDL = `
CREATE TABLE IF NOT EXISTS \`role_permissions\` (
  \`permission_id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  \`role_id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  \`module_name\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  \`permission_type\` enum('view','create','edit','delete') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  \`granted\` tinyint(1) DEFAULT '0',
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`permission_id\`),
  UNIQUE KEY \`unique_role_module_permission\` (\`role_id\`,\`module_name\`,\`permission_type\`),
  KEY \`idx_role_id\` (\`role_id\`),
  CONSTRAINT \`fk_role_permissions_role_id\` FOREIGN KEY (\`role_id\`) REFERENCES \`asset_mngmnt_roles\` (\`roleID\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

export async function ensureRolePermissionsTable(pool: Pool): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = pool
      .execute(ROLE_PERMISSIONS_DDL)
      .then(() => undefined)
      .catch((err: unknown) => {
        ensurePromise = null;
        throw err;
      });
  }
  await ensurePromise;
}
