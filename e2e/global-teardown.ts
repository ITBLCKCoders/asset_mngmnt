import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

const MYSQL_BIN = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
const TEST_DB = process.env.E2E_DB || 'asset_mngmnt_e2e';

async function globalTeardown(_config: FullConfig) {
  execSync(
    `"${MYSQL_BIN}" --force -u root -p"P@ssw0rd" -h localhost -P 3306 -e "DROP DATABASE IF EXISTS \`${TEST_DB}\`"`,
    { stdio: 'pipe', timeout: 30_000, shell: true }
  );
}

export default globalTeardown;
