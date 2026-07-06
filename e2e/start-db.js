const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MYSQL_BIN = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
const DB = process.env.MYSQL_DB || 'asset_mngmnt_e2e';
const ROOT = path.resolve(__dirname, '..');

function run(filePath) {
  const absPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(absPath)) { console.error('File not found:', absPath); return; }
  try {
    execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 ${DB} < "${absPath}"`, { stdio: 'pipe', timeout: 120000, shell: true });
  } catch { /* continue despite non-fatal errors */ }
}

// Create DB
execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 -e "CREATE DATABASE IF NOT EXISTS \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"`, { stdio: 'pipe', shell: true });

// Run migrations - replace USE asset_mngmnt with USE e2e DB
function runMigrated(filePath) {
  const absPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(absPath)) { console.error('File not found:', absPath); return; }
  let sql = fs.readFileSync(absPath, 'utf8');
  // Replace USE `asset_mngmnt` with USE `<DB>`
  sql = sql.replace(/USE\s*`asset_mngmnt`/gi, `USE \`${DB}\``);
  const tmpFile = absPath + '.e2e.tmp';
  fs.writeFileSync(tmpFile, sql, 'utf8');
  try {
    execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 ${DB} < "${tmpFile}"`, { stdio: 'pipe', timeout: 120000, shell: true });
  } catch { /* continue despite non-fatal errors */ }
  try { fs.unlinkSync(tmpFile); } catch {}
}
// Run base schema (dbv20.sql) with USE replacement
runMigrated('db/dbv20.sql');

// Run migrations with USE replacement
runMigrated('db/all_migrations_combined.sql');
// Extra migrations not in combined file
runMigrated('db/migrations/add_password_tracking_to_users.sql');

// Truncate all tables (remove dev data from dbv20.sql) before seeding e2e data
try {
  const tablesJson = execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 -N -B -e "SELECT table_name FROM information_schema.tables WHERE table_schema = '${DB}' AND table_type = 'BASE TABLE'"`, { stdio: 'pipe', shell: true });
  const tables = tablesJson.toString().trim().split(/\s+/).filter(Boolean);
  if (tables.length > 0) {
    const truncateSql = 'SET FOREIGN_KEY_CHECKS = 0; ' + tables.map(t => `TRUNCATE TABLE \`${t}\`;`).join(' ') + ' SET FOREIGN_KEY_CHECKS = 1;';
    execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 ${DB} -e "${truncateSql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', timeout: 60000, shell: true });
    console.log('[start-db] Truncated', tables.length, 'tables');
  }
} catch (e) { /* continue despite truncation errors */ }

// Seed e2e data
run('e2e/fixtures/seed.sql');

// Start server
const cmd = `npx cross-env MYSQL_DB=${DB} HTTP_PORT=${process.env.HTTP_PORT || 6996} npm run dev --workspace=server`;
console.log('[start-db] Starting server:', cmd);
const child = spawn(cmd, {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'test', MYSQL_DB: DB, HTTP_PORT: process.env.HTTP_PORT || '6996' },
});
child.on('exit', (code) => process.exit(code));
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
