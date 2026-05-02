import { Pool } from 'mysql2/promise';
import {
  getAssetScope,
  getDepartmentIdsForScope,
} from '../utils/assetScope.js';

export interface DashboardStats {
  totalAssets: number;
  activeAssignments: number;
  availableAssets: number;
  deployedAssets: number;
  underMaintenance: number;
  forDisposal: number;
  assetReturnsCount: number;
  borrowRequestsCount: number;
  pendingReturnCount: number;
  pendingTransferCount: number;
  disposedAssets: number;
  borrowedAssets: number;
}

export interface AssetByTypeItem {
  typeName: string;
  typeId: string;
  typeCode: string;
  total: number;
  inUse: number;
}

export interface MovementDataPoint {
  period: string;
  label: string;
  assigned: number;
  returned: number;
  available: number;
  transfer: number;
  repair: number;
  borrowRequests: number;
  /** New assignments started in this period (flow). */
  newAssignments: number;
  /** newAssignments minus returns completed in period. */
  netChange: number;
  /** Audit log events mentioning maintenance in period. */
  maintenanceEvents: number;
  /** Audit log events mentioning repair / Under Repair in period. */
  repairEvents: number;
}

export interface MovementSeries {
  weekly: MovementDataPoint[];
  monthly: MovementDataPoint[];
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface NamedCountItem {
  name: string;
  total: number;
  inUse?: number;
}

export interface NamedValueItem {
  name: string;
  value: number;
}

export interface RequestPipelineRow {
  stage: string;
  returnCount: number;
  transferCount: number;
  borrowCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  assetByType: AssetByTypeItem[];
  movement: MovementSeries;
  statusDistribution: StatusDistributionItem[];
  assetsByDepartment: NamedCountItem[];
  assetsByLocation: NamedCountItem[];
  categoryMix: NamedValueItem[];
  brandMix: NamedValueItem[];
  agingBuckets: NamedValueItem[];
  warrantyRunway: NamedValueItem[];
  requestPipeline: RequestPipelineRow[];
}

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-green-500',
  'In Use': 'bg-blue-500',
  Assigned: 'bg-blue-500',
  'Under Maintenance': 'bg-amber-500',
  Borrowed: 'bg-orange-500',
  Retired: 'bg-gray-500',
  Disposed: 'bg-red-500',
  Lost: 'bg-red-500',
  Transferred: 'bg-purple-500',
};

const ALL_STATUSES = [
  'Available',
  'In Use',
  'Under Maintenance',
  'Borrowed',
  'Under Repair',
  'Disposed',
  'Retired',
  'Lost',
  'Transferred',
  'Assigned',
  'For Disposal',
  'For Maintenance',
  'For Repair',
  'Pending Transfer',
  'Pending Return',
  'Returned',
  'Active Assets',
];

const STATUS_DISPLAY_NAMES: Record<string, string> = {
  'In Use': 'Deployed',
  'Under Repair': 'Under Repair',
  Retired: 'For Disposal',
  Transferred: 'Transfered',
  Assigned: 'Active Assets',
};

function buildAssetFilter(
  companyId: string | null,
  departmentIds: string[] | null
): { whereClause: string; params: (string | number)[] } {
  const params: (string | number)[] = [];
  let whereClause = 'a.deleted_at IS NULL';
  if (companyId && companyId !== 'all') {
    params.push(companyId);
    whereClause += ' AND a.company_id = ?';
  }
  if (departmentIds && departmentIds.length > 0) {
    const placeholders = departmentIds.map(() => '?').join(',');
    params.push(...departmentIds);
    whereClause += ` AND a.category_id IN (
      SELECT categoryID FROM asset_categories
      WHERE department_id IN (${placeholders}) AND deleted_at IS NULL
    )`;
  }
  return { whereClause, params };
}

export async function getDashboardData(
  pool: Pool,
  userId: string,
  scopeOverride?: 'it' | 'admin',
  companyIdOverride?: string
): Promise<DashboardData> {
  const scope = await getAssetScope(pool, userId);
  let companyId = scope.companyId;
  let departmentIds = scope.departmentIds;

  if (companyIdOverride) {
    companyId = companyIdOverride === 'all' ? null : companyIdOverride;
  }

  if (scopeOverride) {
    departmentIds = await getDepartmentIdsForScope(
      pool,
      scopeOverride,
      companyId
    );
  }

  if (!companyId && companyIdOverride !== 'all') {
    return getEmptyDashboard();
  }

  const { whereClause, params } = buildAssetFilter(companyId, departmentIds);
  const assetFilterParams = [...params];

  const [
    stats,
    assetByTypeRows,
    movementWeekly,
    movementMonthly,
    statusRows,
    assetsByDepartment,
    assetsByLocation,
    categoryMix,
    brandMix,
    agingBuckets,
    warrantyRunway,
    requestPipeline,
  ] = await Promise.all([
    getStats(pool, whereClause, assetFilterParams, companyId, departmentIds),
    getAssetByType(pool, whereClause, assetFilterParams),
    getMovementSeries(pool, whereClause, assetFilterParams, 'week', departmentIds, companyId),
    getMovementSeries(
      pool,
      whereClause,
      assetFilterParams,
      'month',
      departmentIds,
      companyId
    ),
    getStatusDistribution(pool, whereClause, assetFilterParams),
    getAssetsByDepartment(pool, whereClause, assetFilterParams),
    getAssetsByLocation(pool, whereClause, assetFilterParams),
    getCategoryMix(pool, whereClause, assetFilterParams),
    getBrandMix(pool, whereClause, assetFilterParams),
    getAgingBuckets(pool, whereClause, assetFilterParams),
    getWarrantyRunway(pool, whereClause, assetFilterParams),
    getRequestPipeline(pool, companyId, departmentIds),
  ]);

  const movement: MovementSeries = {
    weekly: movementWeekly,
    monthly: movementMonthly,
  };

  return {
    stats,
    assetByType: assetByTypeRows,
    movement,
    statusDistribution: statusRows,
    assetsByDepartment,
    assetsByLocation,
    categoryMix,
    brandMix,
    agingBuckets,
    warrantyRunway,
    requestPipeline,
  };
}

async function getStats(
  pool: Pool,
  whereClause: string,
  params: (string | number)[],
  companyId: string | null,
  departmentIds: string[] | null
): Promise<DashboardStats> {
  const [totalResult] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause}`,
    params
  )) as any[];
  const totalAssets = Number(totalResult[0]?.cnt ?? 0);

  const [activeResult] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM asset_assignments aa
     INNER JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
     WHERE aa.status = 'Active' AND aa.deleted_at IS NULL${whereClause ? ' AND ' + whereClause.replace(/^a\./, 'a.') : ''}`,
    params
  )) as any[];
  const activeAssignments = Number(activeResult[0]?.cnt ?? 0);

  const [assignedAssetCountResult] = (await pool.execute(
    `SELECT COUNT(DISTINCT aa.asset_id) as cnt FROM asset_assignments aa
     INNER JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
     WHERE aa.status = 'Active' AND aa.deleted_at IS NULL${whereClause ? ' AND ' + whereClause.replace(/^a\./, 'a.') : ''}`,
    params
  )) as any[];
  const assignedAssetCount = Number(assignedAssetCountResult[0]?.cnt ?? 0);

  // Available = assets that do not have an active assignment (Total - distinct assigned assets)
  const availableAssets = Math.max(0, totalAssets - assignedAssetCount);

  const [deployedResult] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause} AND a.status IN ('In Use', 'Assigned')`,
    params
  )) as any[];
  const deployedAssets = Number(deployedResult[0]?.cnt ?? 0);

  const [underMaintenanceResult] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause} AND a.status = 'Under Maintenance'`,
    params
  )) as any[];
  const underMaintenance = Number(underMaintenanceResult[0]?.cnt ?? 0);

  const [forDisposalResult] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause} AND a.status = 'Retired'`,
    params
  )) as any[];
  const forDisposal = Number(forDisposalResult[0]?.cnt ?? 0);

  const [disposedResult] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause} AND a.status = 'Disposed'`,
    params
  )) as any[];
  const disposedAssets = Number(disposedResult[0]?.cnt ?? 0);

  const [borrowedResult] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM assets a WHERE ${whereClause} AND a.status = 'Borrowed'`,
    params
  )) as any[];
  const borrowedAssets = Number(borrowedResult[0]?.cnt ?? 0);

  let assetReturnsCount = 0;
  let borrowRequestsCount = 0;
  let pendingReturnCount = 0;
  let pendingTransferCount = 0;

  const returnFormsParams: (string | number)[] = [];
  let returnFormsWhere = 'arf.deleted_at IS NULL AND arf.process_signed_at IS NOT NULL';
  if (companyId) {
    returnFormsWhere += ' AND d.company_id = ?';
    returnFormsParams.push(companyId);
  }
  const [returnFormsCount] = (await pool.execute(
    `SELECT COUNT(DISTINCT arf.formID) as cnt
     FROM asset_return_forms arf
     LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
     WHERE ${returnFormsWhere}`,
    returnFormsParams
  )) as any[];
  assetReturnsCount = Number(returnFormsCount[0]?.cnt ?? 0);

  const borrowCountParams: (string | number)[] = [];
  let borrowCountWhere = '1=1';
  if (companyId) {
    borrowCountWhere += ' AND br.company_id = ?';
    borrowCountParams.push(companyId);
  }
  if (departmentIds && departmentIds.length > 0) {
    const placeholders = departmentIds.map(() => '?').join(',');
    borrowCountWhere += ` AND br.category_id IN (
      SELECT ac.categoryID FROM asset_categories ac
      WHERE ac.department_id IN (${placeholders}) AND ac.deleted_at IS NULL
    )`;
    borrowCountParams.push(...departmentIds);
  }
  const [borrowCountRows] = (await pool.execute(
    `SELECT COUNT(*) as cnt
     FROM asset_borrow_requests br
     WHERE ${borrowCountWhere}`,
    borrowCountParams
  )) as any[];
  borrowRequestsCount = Number(borrowCountRows[0]?.cnt ?? 0);

  const pendingReturnParams: (string | number)[] = [];
  let pendingReturnWhere =
    'arf.deleted_at IS NULL AND arf.signed_at IS NOT NULL AND arf.dept_head_signed_at IS NULL';
  if (companyId) {
    pendingReturnWhere += ' AND d.company_id = ?';
    pendingReturnParams.push(companyId);
  }
  if (departmentIds && departmentIds.length > 0) {
    pendingReturnWhere += ` AND arf.department_id IN (${departmentIds.map(() => '?').join(',')})`;
    pendingReturnParams.push(...departmentIds);
  }
  const [pendingReturnRows] = (await pool.execute(
    `SELECT COUNT(*) as cnt FROM asset_return_forms arf
     LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
     WHERE ${pendingReturnWhere}`,
    pendingReturnParams
  )) as any[];
  pendingReturnCount = Number(pendingReturnRows[0]?.cnt ?? 0);

  const pendingTransferParams: (string | number)[] = [];
  let pendingTransferWhere =
    'atf.deleted_at IS NULL AND atf.signed_at IS NOT NULL AND atf.dept_head_signed_at IS NULL';
  if (companyId) {
    pendingTransferWhere += ' AND d.company_id = ?';
    pendingTransferParams.push(companyId);
  }
  try {
    if (departmentIds && departmentIds.length > 0) {
      pendingTransferWhere += ` AND atf.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      pendingTransferParams.push(...departmentIds);
    }
    const [pendingTransferRows] = (await pool.execute(
      `SELECT COUNT(*) as cnt FROM asset_transfer_forms atf
       LEFT JOIN asset_mngmnt_departments d ON atf.department_id = d.departmentID
       WHERE ${pendingTransferWhere}`,
      pendingTransferParams
    )) as any[];
    pendingTransferCount = Number(pendingTransferRows[0]?.cnt ?? 0);
  } catch {
    pendingTransferCount = 0;
  }

  return {
    totalAssets,
    activeAssignments,
    availableAssets,
    deployedAssets,
    underMaintenance,
    forDisposal,
    assetReturnsCount,
    borrowRequestsCount,
    pendingReturnCount,
    pendingTransferCount,
    disposedAssets,
    borrowedAssets,
  };
}

async function getAssetByType(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<AssetByTypeItem[]> {
  const [rows] = (await pool.execute(
    `SELECT at.typeID as typeId, COALESCE(at.name, 'Uncategorized') as typeName,
            COALESCE(at.prefix, '') as typeCode,
            COUNT(a.assetID) as total,
            SUM(CASE WHEN a.status IN ('In Use', 'Assigned') THEN 1 ELSE 0 END) as inUse
     FROM assets a
     LEFT JOIN asset_types at ON a.type_id = at.typeID AND at.deleted_at IS NULL
     WHERE ${whereClause}
     GROUP BY at.typeID, at.name, at.prefix
     ORDER BY total DESC`,
    params
  )) as any[];
  return (rows || []).map((r: any) => ({
    typeId: String(r.typeId ?? ''),
    typeName: String(r.typeName ?? 'Uncategorized'),
    typeCode: String(r.typeCode ?? ''),
    total: Number(r.total ?? 0),
    inUse: Number(r.inUse ?? 0),
  }));
}

async function getAssetsByDepartment(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<NamedCountItem[]> {
  const [rows] = (await pool.execute(
    `SELECT COALESCE(d.name, 'Unassigned') as name,
            COUNT(*) as total,
            SUM(CASE WHEN a.status IN ('In Use', 'Assigned') THEN 1 ELSE 0 END) as inUse
     FROM assets a
     LEFT JOIN asset_mngmnt_departments d ON a.department_id = d.departmentID AND d.deleted_at IS NULL
     WHERE ${whereClause}
     GROUP BY COALESCE(d.departmentID, ''), d.name
     ORDER BY total DESC
     LIMIT 15`,
    params
  )) as any[];
  return (rows || []).map((r: any) => ({
    name: String(r.name ?? 'Unassigned'),
    total: Number(r.total ?? 0),
    inUse: Number(r.inUse ?? 0),
  }));
}

async function getAssetsByLocation(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<NamedCountItem[]> {
  const [rows] = (await pool.execute(
    `SELECT COALESCE(
        NULLIF(TRIM(CONCAT_WS(' — ', NULLIF(TRIM(l.building), ''), NULLIF(TRIM(l.name), ''))), ''),
        'Unassigned'
      ) as name,
      COUNT(*) as total
     FROM assets a
     LEFT JOIN asset_mngmnt_locations l ON a.location_id = l.locationID AND l.deleted_at IS NULL
     WHERE ${whereClause}
     GROUP BY a.location_id, l.building, l.name
     ORDER BY total DESC
     LIMIT 12`,
    params
  )) as any[];
  return (rows || []).map((r: any) => ({
    name: String(r.name ?? 'Unassigned'),
    total: Number(r.total ?? 0),
  }));
}

async function getCategoryMix(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<NamedValueItem[]> {
  const [rows] = (await pool.execute(
    `SELECT COALESCE(ac.name, 'Uncategorized') as name, COUNT(*) as value
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID AND ac.deleted_at IS NULL
     WHERE ${whereClause}
     GROUP BY ac.categoryID, ac.name
     ORDER BY value DESC
     LIMIT 10`,
    params
  )) as any[];
  return (rows || []).map((r: any) => ({
    name: String(r.name ?? 'Uncategorized'),
    value: Number(r.value ?? 0),
  }));
}

async function getBrandMix(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<NamedValueItem[]> {
  const [rows] = (await pool.execute(
    `SELECT COALESCE(NULLIF(TRIM(a.brand), ''), 'Unknown') as name, COUNT(*) as value
     FROM assets a
     WHERE ${whereClause}
     GROUP BY COALESCE(NULLIF(TRIM(a.brand), ''), 'Unknown')
     ORDER BY value DESC
     LIMIT 10`,
    params
  )) as any[];
  return (rows || []).map((r: any) => ({
    name: String(r.name ?? 'Unknown'),
    value: Number(r.value ?? 0),
  }));
}

async function getAgingBuckets(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<NamedValueItem[]> {
  const [rows] = (await pool.execute(
    `SELECT bucket, COUNT(*) as value FROM (
       SELECT
         CASE
           WHEN a.purchase_date IS NULL OR a.is_old_unit = 1 THEN 'Unknown / legacy'
           WHEN TIMESTAMPDIFF(YEAR, a.purchase_date, CURDATE()) < 1 THEN '0–1 years'
           WHEN TIMESTAMPDIFF(YEAR, a.purchase_date, CURDATE()) < 3 THEN '1–3 years'
           WHEN TIMESTAMPDIFF(YEAR, a.purchase_date, CURDATE()) < 5 THEN '3–5 years'
           ELSE '5+ years'
         END as bucket
       FROM assets a
       WHERE ${whereClause}
     ) t
     GROUP BY bucket`,
    params
  )) as any[];
  const order = [
    '0–1 years',
    '1–3 years',
    '3–5 years',
    '5+ years',
    'Unknown / legacy',
  ];
  const map = new Map<string, number>();
  (rows || []).forEach((r: any) => {
    map.set(String(r.bucket ?? ''), Number(r.value ?? 0));
  });
  return order.map(k => ({ name: k, value: map.get(k) ?? 0 }));
}

async function getWarrantyRunway(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<NamedValueItem[]> {
  const [rows] = (await pool.execute(
    `SELECT bucket, COUNT(*) as value FROM (
       SELECT
         CASE
           WHEN a.purchase_date IS NULL OR a.warranty_months IS NULL OR a.is_old_unit = 1 THEN 'No warranty data'
           WHEN DATE_ADD(a.purchase_date, INTERVAL a.warranty_months MONTH) < CURDATE() THEN 'Warranty expired'
           WHEN DATE_ADD(a.purchase_date, INTERVAL a.warranty_months MONTH) < DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'Expires within 90 days'
           WHEN DATE_ADD(a.purchase_date, INTERVAL a.warranty_months MONTH) < DATE_ADD(CURDATE(), INTERVAL 365 DAY) THEN '91–365 days'
           ELSE '365+ days remaining'
         END as bucket
       FROM assets a
       WHERE ${whereClause}
     ) t
     GROUP BY bucket`,
    params
  )) as any[];
  const order = [
    'Warranty expired',
    'Expires within 90 days',
    '91–365 days',
    '365+ days remaining',
    'No warranty data',
  ];
  const map = new Map<string, number>();
  (rows || []).forEach((r: any) => {
    map.set(String(r.bucket ?? ''), Number(r.value ?? 0));
  });
  return order.map(k => ({ name: k, value: map.get(k) ?? 0 }));
}

async function getRequestPipeline(
  pool: Pool,
  companyId: string | null,
  departmentIds: string[] | null
): Promise<RequestPipelineRow[]> {
  const deptArf =
    departmentIds && departmentIds.length > 0
      ? ` AND arf.department_id IN (${departmentIds.map(() => '?').join(',')}) `
      : '';
  const deptAtf =
    departmentIds && departmentIds.length > 0
      ? ` AND atf.department_id IN (${departmentIds.map(() => '?').join(',')}) `
      : '';
  const paramsReturn: (string | number)[] = [];
  const paramsTransfer: (string | number)[] = [];
  const paramsBorrow: (string | number)[] = [];
  let returnCompanyWhere = '';
  let transferCompanyWhere = '';
  let borrowCompanyWhere = '';
  if (companyId) {
    returnCompanyWhere = ' AND d.company_id = ?';
    transferCompanyWhere = ' AND d.company_id = ?';
    borrowCompanyWhere = ' AND br.company_id = ?';
    paramsReturn.push(companyId);
    paramsTransfer.push(companyId);
    paramsBorrow.push(companyId);
  }
  if (departmentIds && departmentIds.length > 0) {
    paramsReturn.push(...departmentIds);
    paramsTransfer.push(...departmentIds);
    paramsBorrow.push(...departmentIds);
  }

  const returnSql = `SELECT
      SUM(CASE WHEN arf.signed_at IS NULL AND arf.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_requester,
      SUM(CASE WHEN arf.signed_at IS NOT NULL AND arf.dept_head_signed_at IS NULL AND arf.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_dept,
      SUM(CASE WHEN arf.dept_head_signed_at IS NOT NULL AND arf.process_signed_at IS NULL AND arf.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_completion,
      SUM(CASE WHEN arf.process_signed_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN arf.declined_at IS NOT NULL THEN 1 ELSE 0 END) as declined
    FROM asset_return_forms arf
    INNER JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
    WHERE arf.deleted_at IS NULL${returnCompanyWhere} ${deptArf}`;

  const transferSql = `SELECT
      SUM(CASE WHEN atf.signed_at IS NULL AND atf.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_requester,
      SUM(CASE WHEN atf.signed_at IS NOT NULL AND atf.dept_head_signed_at IS NULL AND atf.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_dept,
      SUM(CASE WHEN atf.dept_head_signed_at IS NOT NULL AND atf.process_signed_at IS NULL AND atf.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_completion,
      SUM(CASE WHEN atf.process_signed_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN atf.declined_at IS NOT NULL THEN 1 ELSE 0 END) as declined
    FROM asset_transfer_forms atf
    INNER JOIN asset_mngmnt_departments d ON atf.department_id = d.departmentID
    WHERE atf.deleted_at IS NULL${transferCompanyWhere} ${deptAtf}`;

  const deptBorrow =
    departmentIds && departmentIds.length > 0
      ? ` AND br.category_id IN (
          SELECT ac.categoryID FROM asset_categories ac
          WHERE ac.department_id IN (${departmentIds.map(() => '?').join(',')})
            AND ac.deleted_at IS NULL
        ) `
      : '';
  const borrowSql = `SELECT
      0 as awaiting_requester,
      SUM(CASE WHEN br.dept_head_signed_at IS NULL AND br.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_dept,
      SUM(CASE WHEN br.dept_head_signed_at IS NOT NULL AND br.approved_at IS NULL AND br.processor_declined_at IS NULL AND br.declined_at IS NULL THEN 1 ELSE 0 END) as awaiting_completion,
      SUM(CASE WHEN br.approved_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN br.declined_at IS NOT NULL OR br.processor_declined_at IS NOT NULL THEN 1 ELSE 0 END) as declined
    FROM asset_borrow_requests br
    WHERE br.deleted_at IS NULL${borrowCompanyWhere} ${deptBorrow}`;

  let ret: any = {};
  let tr: any = {};
  let br: any = {};
  try {
    const [rRows] = (await pool.execute(returnSql, paramsReturn)) as any[];
    ret = rRows?.[0] ?? {};
  } catch {
    ret = {};
  }
  try {
    const [tRows] = (await pool.execute(transferSql, paramsTransfer)) as any[];
    tr = tRows?.[0] ?? {};
  } catch {
    tr = {};
  }
  try {
    const [bRows] = (await pool.execute(borrowSql, paramsBorrow)) as any[];
    br = bRows?.[0] ?? {};
  } catch {
    br = {};
  }

  const stages: Array<{ key: string; label: string }> = [
    { key: 'awaiting_requester', label: 'Awaiting requester' },
    { key: 'awaiting_dept', label: 'Awaiting dept head' },
    { key: 'awaiting_completion', label: 'Awaiting completion' },
    { key: 'completed', label: 'Completed' },
    { key: 'declined', label: 'Declined' },
  ];

  return stages.map(s => ({
    stage: s.label,
    returnCount: Number(ret[s.key] ?? 0),
    transferCount: Number(tr[s.key] ?? 0),
    borrowCount: Number(br[s.key] ?? 0),
  }));
}

/** Format YYYY-MM-DD as short date e.g. Jan 6 */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Generate last 7 days: one entry per day with key YYYY-MM-DD and label e.g. "Mon Jan 20", oldest first. */
function getLast7DaysPeriods(): { key: string; label: string }[] {
  const today = new Date();
  const result: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${dd}`;
    const shortDate = formatShortDate(key);
    const dayName = DAY_NAMES[d.getDay()];
    const label = `${dayName} ${shortDate}`;
    result.push({ key, label });
  }
  return result;
}

/** Generate last 6 month keys (YYYY-MM-01) and labels "Jan 2025", oldest first. */
function getMonthlyPeriods(): { key: string; label: string }[] {
  const today = new Date();
  const result: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${y}-${m}-01`;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const label = `${months[d.getMonth()]} ${y}`;
    result.push({ key, label });
  }
  return result;
}

/** Return period end date YYYY-MM-DD. Weekly key is already a date; monthly key is YYYY-MM-01 so use last day of month. */
function getPeriodEndDate(key: string, period: 'week' | 'month'): string {
  if (period === 'week') return key.slice(0, 10);
  const dateParts = key.split('-');
  const y = Number(dateParts[0] ?? new Date().getFullYear());
  const m = Number(dateParts[1] ?? new Date().getMonth() + 1);
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

async function getMovementSeries(
  pool: Pool,
  whereClause: string,
  params: (string | number)[],
  period: 'week' | 'month',
  departmentIds: string[] | null,
  companyId: string | null
): Promise<MovementDataPoint[]> {
  const assetIdsSubquery = `SELECT assetID FROM assets a WHERE ${whereClause}`;
  const interval = period === 'week' ? '7 DAY' : '6 MONTH';
  const dateFormat =
    period === 'week'
      ? 'DATE(aa.assigned_date)'
      : "DATE_FORMAT(aa.assigned_date, '%Y-%m-01')";

  const dateFormatReturned = dateFormat.replace(
    'aa.assigned_date',
    'aa.actual_return_date'
  );
  const transferDateFormat =
    period === 'week'
      ? 'DATE(at.created_at)'
      : "DATE_FORMAT(at.created_at, '%Y-%m-01')";

  const repairDateFormat =
    period === 'week'
      ? 'DATE(al.created_at)'
      : "DATE_FORMAT(al.created_at, '%Y-%m-01')";
  const auditCompanyFilter = companyId ? ' AND al.company_id = ?' : '';
  const auditParams = companyId ? [companyId] : [];
  const borrowCompanyFilter = companyId ? ' AND br.company_id = ?' : '';
  const borrowParams = companyId
    ? (departmentIds && departmentIds.length > 0 ? [companyId, ...departmentIds] : [companyId])
    : (departmentIds && departmentIds.length > 0 ? [...departmentIds] : []);

  const movementQueries = await Promise.all([
    pool.execute(
      `SELECT ${dateFormatReturned} as period, COUNT(*) as cnt
       FROM asset_assignments aa
       WHERE aa.asset_id IN (${assetIdsSubquery})
         AND aa.deleted_at IS NULL
         AND aa.actual_return_date IS NOT NULL
         AND aa.actual_return_date >= DATE_SUB(CURDATE(), INTERVAL ${interval})
       GROUP BY period
       ORDER BY period`,
      params
    ),
    pool.execute(
      `SELECT ${transferDateFormat} as period, COUNT(*) as cnt
       FROM asset_transfer at
       INNER JOIN asset_assignments aa ON at.assignment_id = aa.assignmentID AND aa.deleted_at IS NULL
       INNER JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
       WHERE ${whereClause.replace(/^a\./, 'a.')} AND at.deleted_at IS NULL
         AND at.created_at >= DATE_SUB(CURDATE(), INTERVAL ${interval})
       GROUP BY period
       ORDER BY period`,
      params
    ),
    pool.execute(
      `SELECT ${repairDateFormat} as period, COUNT(*) as cnt
       FROM audit_logs al
       WHERE al.resource_type = 'asset'
         AND (al.details LIKE '%Under Maintenance%' OR al.details LIKE '%maintenance%' OR al.action LIKE '%maintenance%')
         ${auditCompanyFilter}
         AND al.deleted_at IS NULL
         AND al.created_at >= DATE_SUB(CURDATE(), INTERVAL ${interval})
       GROUP BY period
       ORDER BY period`,
      auditParams
    ),
    pool.execute(
      `SELECT ${dateFormat} as period, COUNT(*) as cnt
       FROM asset_assignments aa
       INNER JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
       WHERE aa.deleted_at IS NULL
         AND aa.asset_id IN (${assetIdsSubquery})
         AND aa.assigned_date >= DATE_SUB(CURDATE(), INTERVAL ${interval})
       GROUP BY period
       ORDER BY period`,
      params
    ),
    pool.execute(
      `SELECT ${repairDateFormat} as period, COUNT(*) as cnt
       FROM audit_logs al
       WHERE al.resource_type = 'asset'
         AND (al.details LIKE '%Under Maintenance%' OR al.action LIKE '%Under Maintenance%')
         ${auditCompanyFilter}
         AND al.deleted_at IS NULL
         AND al.created_at >= DATE_SUB(CURDATE(), INTERVAL ${interval})
       GROUP BY period
       ORDER BY period`,
      auditParams
    ),
    pool.execute(
      `SELECT ${repairDateFormat} as period, COUNT(*) as cnt
       FROM audit_logs al
       WHERE al.resource_type = 'asset'
         AND (al.details LIKE '%Under Repair%' OR al.action LIKE '%Under Repair%')
         ${auditCompanyFilter}
         AND al.deleted_at IS NULL
         AND al.created_at >= DATE_SUB(CURDATE(), INTERVAL ${interval})
       GROUP BY period
       ORDER BY period`,
      auditParams
    ),
    pool.execute(
      `SELECT ${
        period === 'week'
          ? 'DATE(br.created_at)'
          : "DATE_FORMAT(br.created_at, '%Y-%m-01')"
      } as period, COUNT(*) as cnt
       FROM asset_borrow_requests br
       WHERE 1=1
         ${borrowCompanyFilter}
         ${
           departmentIds && departmentIds.length > 0
             ? `AND br.category_id IN (
         SELECT ac.categoryID FROM asset_categories ac
         WHERE ac.department_id IN (${departmentIds.map(() => '?').join(',')}) AND ac.deleted_at IS NULL
       )`
             : ''
         }
         AND br.created_at >= DATE_SUB(CURDATE(), INTERVAL ${interval})
       GROUP BY period
       ORDER BY period`,
      borrowParams
    ),
  ]);

  const returnedRows = (movementQueries[0] as any[])[0];
  const transferRows = (movementQueries[1] as any[])[0];
  const repairRows = (movementQueries[2] as any[])[0];
  const newAssignRows = (movementQueries[3] as any[])[0];
  const maintRows = (movementQueries[4] as any[])[0];
  const repairOnlyRows = (movementQueries[5] as any[])[0];
  const borrowRequestRows = (movementQueries[6] as any[])[0];

  /** Normalize DB period to YYYY-MM-DD (MySQL DATE comes back as Date object or string) */
  const toPeriodKey = (value: any): string => {
    if (value == null) return '';
    if (value instanceof Date) {
      const d = value;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
    const s = String(value);
    if (s.includes('T')) return s.split('T')[0] ?? '';
    return s.slice(0, 10);
  };

  const returnedByPeriod = new Map<string, number>();
  (returnedRows || []).forEach((r: any) => {
    const key = toPeriodKey(r.period);
    if (key) returnedByPeriod.set(key, Number(r.cnt ?? 0));
  });
  const transferByPeriod = new Map<string, number>();
  (transferRows || []).forEach((r: any) => {
    const key = toPeriodKey(r.period);
    if (key) transferByPeriod.set(key, Number(r.cnt ?? 0));
  });
  const repairByPeriod = new Map<string, number>();
  (repairRows || []).forEach((r: any) => {
    const key = toPeriodKey(r.period);
    if (key) repairByPeriod.set(key, Number(r.cnt ?? 0));
  });
  const newAssignByPeriod = new Map<string, number>();
  (newAssignRows || []).forEach((r: any) => {
    const key = toPeriodKey(r.period);
    if (key) newAssignByPeriod.set(key, Number(r.cnt ?? 0));
  });
  const maintByPeriod = new Map<string, number>();
  (maintRows || []).forEach((r: any) => {
    const key = toPeriodKey(r.period);
    if (key) maintByPeriod.set(key, Number(r.cnt ?? 0));
  });
  const repairOnlyByPeriod = new Map<string, number>();
  (repairOnlyRows || []).forEach((r: any) => {
    const key = toPeriodKey(r.period);
    if (key) repairOnlyByPeriod.set(key, Number(r.cnt ?? 0));
  });
  const borrowRequestsByPeriod = new Map<string, number>();
  (borrowRequestRows || []).forEach((r: any) => {
    const key = toPeriodKey(r.period);
    if (key) borrowRequestsByPeriod.set(key, Number(r.cnt ?? 0));
  });

  const periodsWithLabels =
    period === 'week' ? getLast7DaysPeriods() : getMonthlyPeriods();
  const availableByPeriod = new Map<string, number>();
  const activeAssignmentsByPeriod = new Map<string, number>();

  for (const { key } of periodsWithLabels) {
    const periodEnd = getPeriodEndDate(key, period);
    const totalParams = [...params, periodEnd];
    const [totalAtDateRows] = (await pool.execute(
      `SELECT COUNT(*) as cnt FROM assets a
       WHERE ${whereClause} AND DATE(a.created_at) <= ?`,
      totalParams
    )) as any[];
    const totalAtDate = Number(totalAtDateRows?.[0]?.cnt ?? 0);

    const assignedParams = [...params, periodEnd, periodEnd];
    const [assignedAtDateRows] = (await pool.execute(
      `SELECT COUNT(DISTINCT aa.asset_id) as cnt
       FROM asset_assignments aa
       INNER JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
       WHERE aa.deleted_at IS NULL AND ${whereClause.replace(/^a\./, 'a.')}
         AND DATE(aa.assigned_date) <= ?
         AND (aa.actual_return_date IS NULL OR DATE(aa.actual_return_date) > ?)`,
      assignedParams
    )) as any[];
    const assignedAtDate = Number(assignedAtDateRows?.[0]?.cnt ?? 0);
    availableByPeriod.set(key, Math.max(0, totalAtDate - assignedAtDate));
    activeAssignmentsByPeriod.set(key, assignedAtDate);
  }

  return periodsWithLabels.map(({ key, label }) => {
    const returned = returnedByPeriod.get(key) ?? 0;
    const newAssignments = newAssignByPeriod.get(key) ?? 0;
    return {
      period: key,
      label,
      assigned: activeAssignmentsByPeriod.get(key) ?? 0,
      returned,
      available: availableByPeriod.get(key) ?? 0,
      transfer: transferByPeriod.get(key) ?? 0,
      repair: repairByPeriod.get(key) ?? 0,
      borrowRequests: borrowRequestsByPeriod.get(key) ?? 0,
      newAssignments,
      netChange: newAssignments - returned,
      maintenanceEvents: maintByPeriod.get(key) ?? 0,
      repairEvents: repairOnlyByPeriod.get(key) ?? 0,
    };
  });
}

async function getStatusDistribution(
  pool: Pool,
  whereClause: string,
  params: (string | number)[]
): Promise<StatusDistributionItem[]> {
  const [rows] = (await pool.execute(
    `SELECT a.status as name, COUNT(*) as value FROM assets a WHERE ${whereClause} GROUP BY a.status`,
    params
  )) as any[];
  const statusMap = new Map<string, number>();
  (rows || []).forEach((r: any) => {
    statusMap.set(String(r.name ?? 'Unknown'), Number(r.value ?? 0));
  });
  const inUseCount =
    (statusMap.get('In Use') ?? 0) + (statusMap.get('Assigned') ?? 0);

  const [activeResult] = (await pool.execute(
    `SELECT COUNT(DISTINCT aa.asset_id) as cnt FROM asset_assignments aa
     INNER JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
     WHERE aa.status = 'Active' AND aa.deleted_at IS NULL AND ${whereClause.replace(/^a\./, 'a.')}`,
    params
  )) as any[];
  const activeAssetsCount = Number(activeResult[0]?.cnt ?? 0);

  return ALL_STATUSES.map(status => ({
    name: STATUS_DISPLAY_NAMES[status] ?? status,
    value:
      status === 'In Use'
        ? inUseCount
        : status === 'Assigned'
          ? activeAssetsCount
          : (statusMap.get(status) ?? 0),
    color: STATUS_COLORS[status] ?? 'bg-gray-500',
  }));
}

/**
 * Category IDs tied to IT or Admin departments for the company — same rule as
 * `buildAssetFilter` (dashboard stats / charts). Used by Reports to match tab scope.
 */
export async function getCategoryIdsForDashboardScope(
  pool: Pool,
  userId: string,
  scopeKind: 'it' | 'admin',
  companyIdOverride?: string | null
): Promise<string[]> {
  const assetScope = await getAssetScope(pool, userId);
  let companyId = assetScope.companyId;
  if (companyIdOverride) {
    companyId = companyIdOverride === 'all' ? null : companyIdOverride;
  }
  if (!companyId && companyIdOverride !== 'all') {
    return [];
  }

  const departmentIds = await getDepartmentIdsForScope(
    pool,
    scopeKind,
    companyId
  );
  if (departmentIds.length === 0) {
    return [];
  }

  const placeholders = departmentIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT categoryID FROM asset_categories WHERE department_id IN (${placeholders}) AND deleted_at IS NULL`,
    departmentIds
  )) as any[];

  return (rows as any[]).map(r => String(r.categoryID));
}

function getEmptyDashboard(): DashboardData {
  return {
    stats: {
      totalAssets: 0,
      activeAssignments: 0,
      availableAssets: 0,
      deployedAssets: 0,
      underMaintenance: 0,
      forDisposal: 0,
      assetReturnsCount: 0,
      borrowRequestsCount: 0,
      pendingReturnCount: 0,
      pendingTransferCount: 0,
      disposedAssets: 0,
      borrowedAssets: 0,
    },
    assetByType: [],
    movement: { weekly: [], monthly: [] },
    statusDistribution: [],
    assetsByDepartment: [],
    assetsByLocation: [],
    categoryMix: [],
    brandMix: [],
    agingBuckets: [],
    warrantyRunway: [],
    requestPipeline: [],
  };
}
