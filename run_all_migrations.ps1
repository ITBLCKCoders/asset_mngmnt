# Migration execution script for full db4-30-26 feature parity
# Run this after importing db4162026asstmngmnt database

$dbPath = "c:\Users\User\Desktop\systems\asset_mngmnt\db"

# Migration order based on dependencies
$migrations = @(
    # 1. Core schema updates (assets table)
    "add_next_maintenance_date_column.sql",
    "migration_update_condition_enum.sql",
    
    # 2. New table creations (core tables first)
    "migration_create_custodians_table.sql",
    "migration_create_asset_borrow_requests.sql",
    "migration_create_asset_return_forms.sql",
    "migration_create_asset_returns_table.sql",
    "migration_create_asset_transfer_forms.sql",
    
    # 3. Column additions and feature settings
    "migration_add_asset_borrow_form_settings.sql",
    "migration_add_asset_return_form_settings.sql",
    "migration_add_department_to_categories.sql",
    "migration_add_disabled_status.sql",
    "migration_add_role_custodian_fields.sql",
    
    # 4. Stored procedures (core asset management)
    "migration_sp_create_asset_it_admin_numbering.sql",
    "migration_sp_create_asset_with_next_maintenance.sql",
    "migration_sp_update_asset_with_next_maintenance.sql",
    "migration_update_sp_create_asset.sql",
    "migration_update_sp_create_update_role.sql",
    
    # 5. Additional stored procedures
    "migration_add_asset_repository_sps.sql",
    "migration_add_auth_sps.sql",
    "migration_add_notifications_audit_sps.sql",
    "migration_add_asset_assignment_sps.sql",
    "migration_update_stored_procedures.sql",
    
    # 6. User permissions and roles
    "create_user_permissions.sql",
    "migration_role_permissions.sql",
    "migration_user_custodian_settings.sql",
    
    # 7. Asset borrow workflow enhancements
    "migration_asset_borrow_requests_dept_head.sql",
    "migration_asset_borrow_workflow_upgrade.sql",
    "migration_add_asset_borrow_requests_processing.sql",
    
    # 8. Asset return form enhancements
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
    
    # 9. Asset transfer form enhancements
    "migration_add_transfer_form_approvals.sql",
    "migration_add_executed_at_asset_transfer_forms.sql",
    "migration_transfer_form_assignments_and_executed_at.sql",
    "migration_transfer_form_module.sql",
    "migration_transfer_form_sp_return_approval_columns.sql",
    "migration_transfer_hold_and_decline.sql",
    "migration_transfer_processor_pending_signature.sql",
    "migration_transfer_form_assignment_condition.sql",
    
    # 10. Received copy features
    "migration_add_received_copy_201_file_signature.sql",
    "migration_add_received_copy_201_file_signed_by.sql",
    "migration_add_received_copy_signed_by_name.sql",
    "migration_add_received_copy_wet_pdf_url.sql",
    "migration_add_processor_wet_return_pdf_url.sql",
    "migration_add_processor_wet_transfer_pdf_url.sql",
    
    # 11. Additional features
    "migration_add_issuer_signature_column.sql",
    "migration_add_hr_accountability_receiver_to_role_json.sql",
    "migration_add_notifications_audit_sps.sql",
    "migration_asset_counters_department.sql",
    "migration_clear_stored_digital_signatures_name_only.sql",
    
    # 12. Cleanup migrations (optional - may not be needed)
    # "migration_drop_asset_assignment_notification_trigger.sql",
    # "migration_drop_custodians_table.sql",
    "migration_remove_condition_default.sql",
    "migration_remove_pdf_file_path.sql",
    "migration_remove_pdf_file_path_not_null.sql",
    "migration_separate_accountability_data.sql",
    "migration_rename_id_to_return_id.sql",
    
    # 13. Additional tables
    "asset_mngmnt_positions.sql",
    "asset_mngmnt_positions_routines.sql",
    
    # 14. Audit and compliance
    "add_audit_compliance_fields.sql",
    "add_audit_hash_columns.sql",
    "add_company_id_to_stored_procedures.sql",
    "add_mfa_global_setting.sql",
    "cleanup_assets.sql",
    "clear_audit_logs.sql"
)

Write-Host "Running $(($migrations.Count)) migrations in order..."
Write-Host ""

foreach ($migration in $migrations) {
    $migrationPath = Join-Path $dbPath $migration
    if (Test-Path $migrationPath) {
        Write-Host "Running: $migration"
        try {
            Get-Content $migrationPath | mysql asset_mngmnt
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK]"
            } else {
                Write-Host "  [ERROR] MySQL exit code: $LASTEXITCODE"
            }
        } catch {
            Write-Host "  [ERROR] $_"
        }
    } else {
        Write-Host "  [SKIPPED] File not found: $migrationPath"
    }
}

Write-Host ""
Write-Host "Migration execution complete!"
