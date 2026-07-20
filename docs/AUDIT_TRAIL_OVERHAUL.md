# Audit Trail Overhaul Documentation

## Overview

This document describes the comprehensive overhaul of the audit trail system to implement compliance-grade features including hash-chain integrity verification, retention policies, and improved UI.

## Phase A: Backend Integrity & API (Completed)

### Database Migration

**File:** `db/add_audit_compliance_fields.sql`

**Changes:**
- Added compliance metadata columns to `audit_logs` table:
  - `status` (ENUM: success/failure)
  - `severity` (ENUM: info/warning/critical)
  - `request_id` (VARCHAR(64))
  - `session_id` (VARCHAR(64))
  - `http_method` (VARCHAR(16))
  - `http_endpoint` (VARCHAR(255))
  - `prev_hash` (CHAR(64))
  - `row_hash` (CHAR(64))
- Added indexes for filtering performance
- Created `audit_logs_archive` table for archiving old logs
- Created `audit_retention_settings` table for company-specific retention policies
- Added system-wide retention defaults to `asset_mngmnt_settings`

**To apply the migration:**
```bash
mysql -u your_user -p your_database < db/add_audit_compliance_fields.sql
```

### Backend Changes

**Model (`server/src/models/audit.model.ts`):**
- Implemented hash-chain creation using SHA256
- Added `getLogsOlderThan()` for archival
- Added `archiveLog()` to move logs to archive table
- Removed delete operations for append-only behavior
- Enhanced filtering with server-side pagination

**Service (`server/src/services/audit.service.ts`):**
- Refactored to use filter objects
- Added `verifyChain()` for integrity verification
- Removed delete API
- Enhanced error logging

**Controller (`server/src/controllers/audit.controller.ts`):**
- Added role/company-based access control (admin/auditor only)
- Implemented server-side filtering and pagination
- Added `verifyAuditChainHandler` for chain verification
- Removed POST create endpoint (use utility instead)

**Routes (`server/src/routes/audit.routes.ts`):**
- Removed `POST /api/audit` endpoint
- Added `GET /api/audit/verify` endpoint for chain verification
- Updated Swagger documentation

**Utility (`server/src/utils/audit.ts`):**
- Switched to `AuditService.create` instead of stored procedure
- Added `AuditContext` helper to extract request metadata
- Enhanced error logging with structured data

### Shared Contracts

**File:** `shared/types/audit.ts`

Added standardized types for audit vocabulary:
- `AuditStatus`: 'success' | 'failure'
- `AuditSeverity`: 'info' | 'warning' | 'critical'
- `AuditAction`: Standard action strings
- `AuditResourceType`: Standard resource types

**File:** `shared/types/dtos.ts`

Extended with compliance metadata fields and `AuditLogListFiltersDto`.

## Phase B: Frontend Overhaul (Completed)

### Audit Trail Page

**File:** `client/src/pages/assets-history/auditTrail.tsx`

**Features:**
- Replaced card list with sortable table
- Added multi-select filters (action, resource type, status, severity)
- Added date range picker
- Implemented server-side pagination
- Added details drawer with diff view and raw JSON toggle
- Added export functionality (CSV and JSON)
- Added verification banner showing chain integrity status
- Added relative-time display with absolute tooltips

### Audit Retention Settings Tab

**File:** `client/src/pages/settings/settingsComponents/settingsTabs/auditRetentionTab.tsx`

**Features:**
- Company-level retention settings (retention period, enable/disable archival)
- Archive status display (last archived date, total archived count)
- Manual archive trigger button
- System-wide defaults (global admin only)
- Important notes and warnings

**File:** `client/src/pages/settings/settingsComponents/settingsTab.tsx`

Added "Audit Retention" tab to settings navigation.

## Phase C: Retention, Verification, Operations (Completed)

### Retention API

**Model (`server/src/models/auditRetention.model.ts`):**
- CRUD operations for retention settings
- Archive statistics tracking
- System defaults management

**Service (`server/src/services/auditRetention.service.ts`):**
- Business logic for retention settings
- Archive orchestration
- Audit logging for retention changes

**Controller (`server/src/controllers/auditRetention.controller.ts`):**
- `GET /api/audit-retention/settings` - Get company retention settings
- `PUT /api/audit-retention/settings` - Update company retention settings
- `POST /api/audit-retention/archive` - Trigger manual archive
- `GET /api/audit-retention/defaults` - Get system defaults (global admin)
- `PUT /api/audit-retention/defaults` - Update system defaults (global admin)

**Routes (`server/src/routes/auditRetention.routes.ts`):**
- Mounted at `/api/audit-retention`
- All endpoints require authentication

### Archive Job Script

**File:** `server/scripts/archive-audit-logs.js`

**Usage:**
```bash
node server/scripts/archive-audit-logs.js
```

**Cron example (daily at 2 AM):**
```cron
0 2 * * * cd /path/to/project && node server/scripts/archive-audit-logs.js
```

The script:
1. Fetches all companies with active retention settings
2. Archives logs exceeding retention period for each company
3. Reports total archived count and any errors

### Coverage Audit Script

**File:** `server/scripts/audit-coverage-check.js`

**Usage:**
```bash
node server/scripts/audit-coverage-check.js
```

The script:
1. Grep searches for all `createAuditLog` and `AuditService.create` calls
2. Checks all controllers for mutation routes without audit logging
3. Reports controllers likely missing audit coverage
4. Returns exit code 1 if issues found

### Verification UI Banner

Added to `client/src/pages/assets-history/auditTrail.tsx`:
- Automatically checks chain integrity on page load
- Shows red banner if chain is broken with break point
- Shows green banner if chain is valid
- Includes "Re-verify" button to manually trigger verification

## Migration Steps

### 1. Apply Database Migration
```bash
mysql -u your_user -p your_database < db/add_audit_compliance_fields.sql
```

### 2. Update Server Dependencies
No new dependencies required. Ensure `mysql2` and `crypto` are available.

### 3. Restart Server
```bash
cd server
npm run build
npm run dev
```

### 4. Update Client
No new dependencies required. Ensure `date-fns`, `lucide-react`, and UI components are available.

### 5. Configure Retention
- Navigate to Settings → Audit Retention
- Set retention period (6-120 months)
- Enable automatic archival
- Optionally configure system defaults (global admin)

### 6. Set Up Archive Job (Optional)
Add to crontab or use a job scheduler:
```cron
0 2 * * * cd /path/to/project && node server/scripts/archive-audit-logs.js >> /var/log/audit-archive.log 2>&1
```

## API Endpoints

### Audit Logs
- `GET /api/audit` - Get paginated audit logs with filters
  - Query params: page, limit, search, sortBy, sortOrder, action, resourceType, status, severity, dateFrom, dateTo
- `GET /api/audit/verify` - Verify audit chain integrity
  - Returns: { valid: boolean, breakPoint: string | null }

### Audit Retention
- `GET /api/audit-retention/settings` - Get company retention settings
- `PUT /api/audit-retention/settings` - Update company retention settings
  - Body: { retention_months: number, is_active: boolean }
- `POST /api/audit-retention/archive` - Trigger manual archive
- `GET /api/audit-retention/defaults` - Get system defaults (global admin)
- `PUT /api/audit-retention/defaults` - Update system defaults (global admin)
  - Body: { default_months: number, minimum_months: number }

## Security Considerations

### Access Control
- Audit log access restricted to admins and auditors only
- System defaults restricted to global admin only
- Verification endpoint requires admin/auditor role

### Hash Chain Integrity
- Each log entry contains `prev_hash` and `row_hash`
- Hashes computed using SHA256 on stable-ordered payload
- Chain verification detects tampering
- Archive preserves hash chain integrity

### Append-Only Behavior
- Delete operations removed from audit model
- Soft delete via `deleted_at` column only
- Archive moves logs to separate table, doesn't delete

## Troubleshooting

### Verification Shows Chain Broken
1. Check if logs were modified directly in database
2. Review `prev_hash` and `row_hash` values
3. Check for gaps in created_at sequence
4. Re-run verification after investigating

### Archive Job Fails
1. Check database connection
2. Verify retention settings exist for company
3. Check logs for specific error messages
4. Ensure sufficient disk space

### Frontend Shows No Logs
1. Verify user has admin/auditor role
2. Check API response in browser dev tools
3. Verify company context is resolved
4. Check filter settings

## Performance Considerations

### Indexes
- Added indexes on: status, severity, request_id, session_id, company_id + created_at, resource_type + resource_id, row_hash
- Ensure these indexes exist for optimal query performance

### Pagination
- Server-side pagination enforced (max 1000 per request)
- Use appropriate page/limit values
- Avoid fetching all logs at once

### Archival
- Archive job processes logs in batches
- Consider running during off-peak hours
- Monitor archived count to ensure job is working

## Future Enhancements

1. **Retention Policies per Resource Type** - Different retention for different resources
2. **Audit Log Encryption** - Encrypt sensitive data in logs
3. **Export to Compliance Formats** - Generate PDF/Word reports
4. **Real-time Monitoring** - WebSocket alerts for critical audit events
5. **Audit Log Search API** - Full-text search on log details
6. **Retention Policy Templates** - Pre-configured policies for compliance standards
