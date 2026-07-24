const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'P@ssw0rd',
    database: 'asset_mngmnt'
  });
  const [compRows] = await c.execute(
    "SELECT companyID FROM asset_mngmnt_companies WHERE name LIKE '%Black Coders%' LIMIT 1"
  );
  const companyId = compRows[0]?.companyID;
  console.log('Company ID:', companyId);

  // All non-deleted assets
  const [allA] = await c.execute(
    'SELECT COUNT(*) as cnt FROM assets WHERE company_id=? AND deleted_at IS NULL',
    [companyId]
  );
  console.log('All non-deleted assets:', allA[0].cnt);

  // Active assets
  const [actA] = await c.execute(
    "SELECT COUNT(*) as cnt FROM assets WHERE company_id=? AND deleted_at IS NULL AND status=?",
    [companyId, 'Active']
  );
  console.log('Assets with status=Active:', actA[0].cnt);

  // Assets with active assignment
  const [asgnA] = await c.execute(
    `SELECT COUNT(DISTINCT a.assetID) as cnt
     FROM assets a
     INNER JOIN asset_assignments aa ON aa.asset_id = a.assetID AND aa.status=? AND aa.deleted_at IS NULL
     WHERE a.company_id=? AND a.deleted_at IS NULL`,
    ['Active', companyId]
  );
  console.log('Assets with Active assignment:', asgnA[0].cnt);

  // By status
  const [byStatus] = await c.execute(
    'SELECT status, COUNT(*) as cnt FROM assets WHERE company_id=? AND deleted_at IS NULL GROUP BY status',
    [companyId]
  );
  console.log('By status:');
  for (const s of byStatus) {
    console.log(`  ${s.status}: ${s.cnt}`);
  }

  // Assets with NO active assignment
  const [noAsgn] = await c.execute(
    `SELECT COUNT(*) as cnt FROM assets a
     WHERE a.company_id=? AND a.deleted_at IS NULL
     AND a.assetID NOT IN (
       SELECT asset_id FROM asset_assignments WHERE status='Active' AND deleted_at IS NULL
     )`,
    [companyId]
  );
  console.log('Assets with NO active assignment:', noAsgn[0].cnt);

  // Assets with NO active assignment by status
  const [noAsgnStatus] = await c.execute(
    `SELECT a.status, COUNT(*) as cnt FROM assets a
     WHERE a.company_id=? AND a.deleted_at IS NULL
     AND a.assetID NOT IN (
       SELECT asset_id FROM asset_assignments WHERE status='Active' AND deleted_at IS NULL
     )
     GROUP BY a.status`,
    [companyId]
  );
  console.log('Assets with NO active assignment by status:');
  for (const s of noAsgnStatus) {
    console.log(`  ${s.status}: ${s.cnt}`);
  }

  // Active assignments count for Select Assets tab
  const [activeAsgn] = await c.execute(
    `SELECT COUNT(*) as cnt FROM asset_assignments aa
     INNER JOIN assets a ON aa.asset_id = a.assetID
     WHERE aa.status='Active' AND aa.deleted_at IS NULL
     AND a.deleted_at IS NULL AND a.company_id=?`,
    [companyId]
  );
  console.log('Active assignments (Select Assets base):', activeAsgn[0].cnt);

  // Active assignments not in builders (approximation)
  const [activeAsgnNoBuilder] = await c.execute(
    `SELECT COUNT(*) as cnt FROM asset_assignments aa
     INNER JOIN assets a ON aa.asset_id = a.assetID
     WHERE aa.status='Active' AND aa.deleted_at IS NULL
     AND a.deleted_at IS NULL AND a.company_id=?
     AND a.asset_code NOT IN (
       SELECT DISTINCT TRIM(asset_code) FROM asset_builder_items WHERE asset_code IS NOT NULL AND asset_code != ''
     )`,
    [companyId]
  );
  console.log('Active assignments NOT in builders (Select Assets filtered):', activeAsgnNoBuilder[0].cnt);

  await c.end();
})();