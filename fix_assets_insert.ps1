$content = Get-Content "asset_data_import.sql" -Raw

# Fix the assets table INSERT by adding NULL for next_maintenance_date
# Pattern: match status value followed by datetime, insert NULL between them
# The status is one of: Available, In Use, Under Maintenance, Retired, Disposed, Lost, Assigned
# After status comes created_at datetime (format: 2026-XX-XX XX:XX:XX)

$content = $content -replace "'Available','2026-", "'Available',NULL,'2026-"
$content = $content -replace "'In Use','2026-", "'In Use',NULL,'2026-"
$content = $content -replace "'Under Maintenance','2026-", "'Under Maintenance',NULL,'2026-"
$content = $content -replace "'Retired','2026-", "'Retired',NULL,'2026-"
$content = $content -replace "'Disposed','2026-", "'Disposed',NULL,'2026-"
$content = $content -replace "'Lost','2026-", "'Lost',NULL,'2026-"
$content = $content -replace "'Assigned','2026-", "'Assigned',NULL,'2026-"

Set-Content "asset_data_import.sql" -Value $content -NoNewline

Write-Host "Fixed assets INSERT statements"
