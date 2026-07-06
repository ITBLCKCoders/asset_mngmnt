const { spawn } = require('child_process');
const s = spawn('npx', [
  'cross-env', `MYSQL_DB=${process.env.MYSQL_DB || 'asset_mngmnt_e2e'}`,
  `HTTP_PORT=${process.env.HTTP_PORT || '6996'}`,
  'npm', 'run', 'dev', '--workspace=server'
], {
  cwd: __dirname + '/..',
  shell: true,
  stdio: 'pipe',
  detached: true,
});
s.unref();
console.log('Server PID:', s.pid);
