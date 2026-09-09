/* Temporary diagnostic 2: audit logs today + form 0081 notifications + approver fallback check. */
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root',
    password: 'P@ssw0rd', database: 'asset_mngmnt',
  });

  console.log('=== Audit logs today (2026-09-09), latest 25 ===');
  const [audits] = await c.query(
    `SELECT auditID, action, resource_type, resource_id, details, created_at
     FROM audit_logs
     WHERE created_at >= '2026-09-09 00:00:00'
     ORDER BY created_at DESC LIMIT 25`
  );
  console.table(audits.map(a => ({
    action: a.action, resource: a.resource_type, details: String(a.details).slice(0, 90),
    at: a.created_at,
  })));

  console.log('=== Notifications referencing form 0081 (still pending) ===');
  const [n81] = await c.query(
    `SELECT notificationID, user_id, title, status, created_at FROM notifications
     WHERE data LIKE '%0281ab63%' ORDER BY created_at DESC LIMIT 10`
  );
  console.table(n81);

  console.log('=== user_approvers rows for owner 92dbe68d (form 0083 user) ===');
  const [ownerApprovers] = await c.query(
    `SELECT ua.approver_user_id, ua.approver_type FROM user_approvers ua WHERE ua.user_id = '92dbe68d-b9da-417f-9856-08e8f41a8843'`
  );
  console.table(ownerApprovers);

  console.log('=== Users with NO approver rows (sample) ===');
  const [noApprovers] = await c.query(
    `SELECT u.userID, u.first_name, u.last_name FROM users u
     WHERE u.is_active = 1 AND NOT EXISTS (SELECT 1 FROM user_approvers ua WHERE ua.user_id = u.userID)
     LIMIT 20`
  );
  console.table(noApprovers);

  await c.end();
})().catch((e) => { console.error('DIAG ERROR:', e.message); process.exit(1); });
