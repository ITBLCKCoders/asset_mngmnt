-- Drop the per-row notification trigger on asset_assignments.
-- The app now creates a single bulk "Assets assigned" notification in
-- createAssetAssignmentHandler; the trigger was creating one notification
-- per asset (e.g. 5 assets = 5 notifications).

DROP TRIGGER IF EXISTS trg_after_asset_assignment_insert;
