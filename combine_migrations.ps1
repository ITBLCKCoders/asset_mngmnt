$dbPath = "c:\Users\User\Desktop\systems\asset_mngmnt\db"

$migrations = @(
    "add_next_maintenance_date_column.sql",
    "migration_update_condition_enum.sql",
    "migration_create_custodians_table.sql",
    "migration_create_asset_borrow_requests.sql",
    "migration_create_asset_return_forms.sql",
    "migration_create_asset_returns_table.sql",
    "migration_create_asset_transfer_forms.sql",
    "migration_add_asset_borrow_form_settings.sql",
    "migration_add_asset_return_form_settings.sql",
    "migration_add_department_to_categories.sql",
    "migration_add_disabled_status.sql",
    "migration_add_role_custodian_fields.sql",
    "migration_sp_create_asset_it_admin_numbering.sql",
    "migration_sp_create_asset_with_next_maintenance.sql",
    "migration_sp_update_asset_with_next_maintenance.sql",
    "migration_update_sp_create_asset.sql",
    "migration_update_sp_create_update_role.sql",
    "migration_add_asset_repository_sps.sql",
    "migration_add_auth_sps.sql",
    "migration_add_notifications_audit_sps.sql",
    "migration_add_asset_assignment_sps.sql",
    "migration_update_stored_procedures.sql",
    "create_user_permissions.sql",
    "migration_role_permissions.sql",
    "migration_user_custodian_settings.sql",
    "migration_asset_borrow_requests_dept_head.sql",
    "migration_asset_borrow_workflow_upgrade.sql",
    "migration_add_asset_borrow_requests_processing.sql",
    "migration_add_dept_head_signature_asset_return_forms_simple.sql",
    "migration_add_it_manager_signature_asset_return_forms.sql",
    "migration_add_process_signature_asset_return_forms.sql",
    "migration_add_returner_signature_asset_return_forms.sql",
    "migration_add_owner_absent_asset_return_forms.sql",
    "migration_add_processor_decline_and_position_asset_return_forms.sql",
    "migration_add_condition_images_asset_returns.sql",
    "migration_add_return_location_fields.sql",
    "migration_add_return_type_received_by.sql",
    "migration_add_return_batch_id.sql",
    "migration_accountability_form_decline.sql",
    "migration_add_transfer_form_approvals.sql",
    "migration_add_executed_at_asset_transfer_forms.sql",
    "migration_transfer_form_assignments_and_executed_at.sql",
    "migration_transfer_form_module.sql",
    "migration_transfer_form_sp_return_approval_columns.sql",
    "migration_transfer_hold_and_decline.sql",
    "migration_transfer_processor_pending_signature.sql",
    "migration_transfer_form_assignment_condition.sql",
    "migration_add_received_copy_201_file_signature.sql",
    "migration_add_received_copy_201_file_signed_by.sql",
    "migration_add_received_copy_signed_by_name.sql",
    "migration_add_received_copy_wet_pdf_url.sql",
    "migration_add_processor_wet_return_pdf_url.sql",
    "migration_add_processor_wet_transfer_pdf_url.sql",
    "migration_add_issuer_signature_column.sql",
    "migration_add_hr_accountability_receiver_to_role_json.sql",
    "migration_add_notifications_audit_sps.sql",
    "migration_asset_counters_department.sql",
    "migration_clear_stored_digital_signatures_name_only.sql",
    "migration_remove_condition_default.sql",
    "migration_remove_pdf_file_path.sql",
    "migration_remove_pdf_file_path_not_null.sql",
    "migration_separate_accountability_data.sql",
    "migration_rename_id_to_return_id.sql",
    "asset_mngmnt_positions.sql",
    "asset_mngmnt_positions_routines.sql",
    "add_audit_compliance_fields.sql",
    "add_audit_hash_columns.sql",
    "add_company_id_to_stored_procedures.sql",
    "add_mfa_global_setting.sql",
    "cleanup_assets.sql",
    "clear_audit_logs.sql"
)

$outputPath = Join-Path $dbPath "all_migrations_combined.sql"

foreach ($migration in $migrations) {
    $migrationPath = Join-Path $dbPath $migration
    if (Test-Path $migrationPath) {
        Write-Host "Adding: $migration"
        Get-Content $migrationPath | Add-Content $outputPath
        "-- End of $migration" | Add-Content $outputPath
        "" | Add-Content $outputPath
    } else {
        Write-Host "  [SKIPPED] File not found: $migrationPath"
    }
}

Write-Host "Combined migrations saved to: $outputPath"
