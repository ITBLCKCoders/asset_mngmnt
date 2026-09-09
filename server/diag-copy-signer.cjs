/* Temporary diagnostic: inspect recent accountability forms, issuer approvers,
 * and related notifications. Safe to delete. */
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'P@ssw0rd',
    database: 'asset_mngmnt',
  });

  const [forms] = await c.query(
    `SELECT formID, form_number, user_id, created_by, approval_status,
            admin_copy_signer_id, admin_copy_copy_type, created_at
     FROM accountability_forms
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 8`
  );
  console.log('=== Recent accountability forms ===');
  console.table(forms);

  if (forms.length > 0) {
    const issuers = [...new Set(forms.map((f) => f.created_by).filter(Boolean))];
    for (const issuer of issuers) {
      const [u] = await c.query(
        'SELECT userID, first_name, last_name, company_id FROM users WHERE userID = ?',
        [issuer]
      );
      console.log(`=== Issuer ${issuer} ===`);
      console.table(u);
      const [approvers] = await c.query(
        `SELECT ua.user_id, ua.approver_user_id, ua.approver_type,
                CONCAT(a.first_name,' ',a.last_name) AS approver_name
         FROM user_approvers ua
         LEFT JOIN users a ON ua.approver_user_id = a.userID
         WHERE ua.user_id = ?`,
        [issuer]
      );
      console.table(approvers);

      const [notifs] = await c.query(
        `SELECT notificationID, user_id, title, type, status, created_at
         FROM notifications
         WHERE data LIKE ?
         ORDER BY created_at DESC LIMIT 10`,
        [`%${String(forms[0].formID)}%`]
      );
      console.log(`=== Notifications referencing latest form ${forms[0].formID} ===`);
      console.table(notifs);
    }
  }

  const [recentNotifs] = await c.query(
    `SELECT notificationID, user_id, title, type, status, created_at
     FROM notifications
     WHERE type = 'accountability_form'
     ORDER BY created_at DESC LIMIT 12`
  );
  console.log('=== Recent accountability_form notifications ===');
  console.table(recentNotifs);

  await c.end();
})().catch((e) => {
  console.error('DIAG ERROR:', e.message);
  process.exit(1);
});
