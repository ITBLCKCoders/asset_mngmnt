import type { PoolConnection } from 'mysql2/promise';
import { createAuditLog } from './audit.js';

export type AssignmentRowForReturn = {
  assignmentID: string;
  asset_id: string;
  user_id: string;
  status: string;
};

/**
 * After sp_return_assignment: builder maintenance, return audit, optional assignee notification.
 * Mirrors returnAssetHandler (assetAssignments.controller) for use inside transactions.
 */
export async function applyReturnAssignmentSideEffectsOnConnection(
  conn: PoolConnection,
  assignment: AssignmentRowForReturn,
  returnNotes: string,
  actingUserId: string,
  meta: {
    ipAddress: string;
    userAgent: string;
    skipAssigneeNotification?: boolean;
  }
): Promise<void> {
  const { ipAddress, userAgent, skipAssigneeNotification } = meta;

  const [builderRows] = (await conn.execute(
    `SELECT ab.builderID, ab.name, ab.status as builder_status
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
    [assignment.asset_id]
  )) as any[];

  if (builderRows.length > 0) {
    const builder = builderRows[0];

    const [assignedAssetRows] = (await conn.execute(
      `SELECT COUNT(*) as assigned_count
       FROM asset_builder_items abi
       JOIN assets a ON abi.asset_id = a.assetID
       WHERE abi.builder_id = ? AND a.status = 'Assigned' AND a.deleted_at IS NULL`,
      [builder.builderID]
    )) as any[];

    const assignedCount = assignedAssetRows[0]?.assigned_count || 0;

    if (assignedCount === 0 && builder.builder_status === 'Assigned') {
      await conn.execute(
        'UPDATE asset_builders SET status = "Available", updated_by = ?, updated_at = NOW() WHERE builderID = ?',
        [actingUserId, builder.builderID]
      );

      const [assetCodeRows] = (await conn.execute(
        'SELECT asset_code FROM assets WHERE assetID = ?',
        [assignment.asset_id]
      )) as any[];
      const returnedAssetCode =
        assetCodeRows[0]?.asset_code || assignment.asset_id;

      await createAuditLog({
        userId: actingUserId,
        action: 'Updated Asset Builder Status',
        resourceType: 'asset_builder',
        resourceId: builder.builderID,
        resourceName: builder.name,
        details: `Asset builder "${builder.name}" status updated to "Available" due to asset return. Assets returned:\n• ${returnedAssetCode}`,
        oldValues: { status: 'Assigned' },
        newValues: {
          status: 'Available',
          returned_asset_codes: [returnedAssetCode],
        },
        ipAddress,
        userAgent,
      });
    }

    if (assignedCount > 0) {
      await conn.execute('DELETE FROM asset_builder_items WHERE asset_id = ?', [
        assignment.asset_id,
      ]);
      const [assetCodeRowsForRemove] = (await conn.execute(
        'SELECT asset_code FROM assets WHERE assetID = ?',
        [assignment.asset_id]
      )) as any[];
      const assetCodeForRemove =
        assetCodeRowsForRemove[0]?.asset_code || assignment.asset_id;
      await createAuditLog({
        userId: actingUserId,
        action: 'Removed from Asset Builder',
        resourceType: 'asset',
        resourceId: assetCodeForRemove,
        resourceName: assetCodeForRemove,
        details: `Asset "${assetCodeForRemove}" removed from asset builder due to partial return`,
        oldValues: { builder_ids: builderRows.map((b: any) => b.builderID) },
        ipAddress,
        userAgent,
      });
      for (const b of builderRows) {
        await createAuditLog({
          userId: actingUserId,
          action: 'Removed from Asset Builder',
          resourceType: 'asset_builder',
          resourceId: b.builderID,
          resourceName: b.name,
          details: `Asset "${assetCodeForRemove}" removed from asset builder due to partial return`,
          oldValues: {
            asset_id: assignment.asset_id,
            asset_code: assetCodeForRemove,
          },
          ipAddress,
          userAgent,
        });
      }
    }
  }

  await createAuditLog({
    userId: actingUserId,
    action: 'Returned Asset',
    resourceType: 'asset_assignment',
    resourceId: assignment.assignmentID,
    resourceName: assignment.asset_id,
    details: `Asset returned with notes: ${returnNotes || 'None'}`,
    oldValues: {
      status: assignment.status,
    },
    newValues: {
      status: 'Returned',
      actual_return_date: new Date(),
      return_notes: returnNotes,
    },
    ipAddress,
    userAgent,
  });

  void skipAssigneeNotification;
}
