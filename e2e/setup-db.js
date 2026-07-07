const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MYSQL_BIN = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
const DB = process.env.MYSQL_DB || 'asset_mngmnt_e2e';
const ROOT = path.resolve(__dirname, '..');

function run(filePath) {
  const absPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(absPath)) { console.error('File not found:', absPath); return; }
  execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 ${DB} < "${absPath}"`, { stdio: 'pipe', timeout: 120000, shell: true });
}

function runMigrated(filePath) {
  const absPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(absPath)) { console.error('File not found:', absPath); return; }
  let sql = fs.readFileSync(absPath, 'utf8');
  sql = sql.replace(/USE\s*`asset_mngmnt`/gi, `USE \`${DB}\``);
  const tmpFile = absPath + '.e2e.tmp';
  fs.writeFileSync(tmpFile, sql, 'utf8');
  execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 ${DB} < "${tmpFile}"`, { stdio: 'pipe', timeout: 120000, shell: true });
  try { fs.unlinkSync(tmpFile); } catch {}
  console.log('Done:', filePath);
}

console.log('1. Running dbv20.sql...');
runMigrated('db/dbv20.sql');

console.log('2. Running migrations...');
runMigrated('db/all_migrations_combined.sql');
// Extra migrations not in combined file
console.log('   Running extra migrations...');
runMigrated('db/migrations/add_password_tracking_to_users.sql');

console.log('3. Truncating all tables...');
try {
  const tablesOutput = execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 -N -B -e "SELECT table_name FROM information_schema.tables WHERE table_schema = '${DB}' AND table_type = 'BASE TABLE'"`, { stdio: 'pipe', shell: true });
  const tables = tablesOutput.toString().trim().split(/\s+/).filter(Boolean);
  if (tables.length > 0) {
    const truncateSql = 'SET FOREIGN_KEY_CHECKS = 0; ' + tables.map(t => `TRUNCATE TABLE \`${t}\`;`).join(' ') + ' SET FOREIGN_KEY_CHECKS = 1;';
    execSync(`"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 ${DB} -e "${truncateSql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', timeout: 60000, shell: true });
    console.log('Truncated', tables.length, 'tables');
  }
} catch (e) { }

console.log('4. Seeding e2e data...');
run('e2e/fixtures/seed.sql');

console.log('DB setup complete!');
