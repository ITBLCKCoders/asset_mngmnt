<# .SYNOPSIS
    Creates a full copy of the asset_mngmnt database into a new database
    (default: asset_mngmnt_prod) used by the LIVE environment on port 9999.
.DESCRIPTION
    Copies schema + data + routines + triggers + events from the source DB
    (default: asset_mngmnt) into the target DB.  Reuses MySQL bin auto-detection
    from init_uat_db.ps1.

    Modes:
      Default           Full copy  source -> target  on this machine
                        (structure + ALL data + routines + triggers + events).
      -SchemaOnly       Sync schema + routines/triggers + reference data to the
                        target WITHOUT touching existing target data.  Existing
                        tables are kept (CREATE TABLE IF NOT EXISTS); new
                        tables, SPs and triggers are applied.  Reference tables
                        (users, roles, permissions, custodians, addresses) are
                        synced with INSERT IGNORE.  Column changes to EXISTING
                        tables still need their migration SQL run manually.
      -DumpOnly <file>  Export a portable full dump file (to transfer to
                        another computer).  No restore happens.
      -ImportFile <f>   Import a previously exported dump into the target DB.
                        Skips the local source dump entirely.

    Run this BEFORE starting the LIVE server (.env.live).
#>

param(
    [string]$SourceEnv = (Join-Path $PSScriptRoot "..\server\.env"),
    [string]$SourceDb,
    [string]$TargetDb  = "asset_mngmnt_prod",
    [string]$DumpOnly,
    [string]$ImportFile,
    [switch]$SchemaOnly
)

# ---- helpers ---------------------------------------------------------------
function Get-EnvValue($file, $key) {
    $line = Select-String -Path $file -Pattern "^$key=(.+)" | Select-Object -First 1
    if ($line) { return $line.Matches.Groups[1].Value.Trim() }
    return $null
}

function Find-MySqlBin {
    $paths = @(
        "${env:ProgramFiles}\MySQL\MySQL Server 8.0\bin",
        "${env:ProgramFiles}\MySQL\MySQL Server 8.4\bin",
        "${env:ProgramFiles}\MySQL\MySQL Server 9.0\bin",
        "${env:ProgramFiles(x86)}\MySQL\MySQL Server 8.0\bin",
        "${env:ProgramFiles}\MySQL\Current\bin",
        "${env:LOCALAPPDATA}\Programs\MySQL\MySQL Server 8.0\bin"
    )
    foreach ($p in $paths) {
        $exe = Join-Path $p "mysql.exe"
        if (Test-Path $exe) { return $p }
    }
    return $null
}

# ---- locate MySQL tools ----------------------------------------------------
$mysqlDir = $null

# Try PATH first
$mysqlExe = Get-Command "mysql.exe" -ErrorAction SilentlyContinue
$dumpExe = Get-Command "mysqldump.exe" -ErrorAction SilentlyContinue
if ($mysqlExe -and $dumpExe) {
    $mysqlDir = Split-Path $mysqlExe.Source -Parent
} else {
    $mysqlDir = Find-MySqlBin
    if ($mysqlDir) {
        $env:Path = "$mysqlDir;$env:Path"
    }
}

if (-not $mysqlDir -or -not (Test-Path (Join-Path $mysqlDir "mysql.exe"))) {
    Write-Error "MySQL tools not found.  Ensure mysql.exe and mysqldump.exe are on PATH, or install MySQL Server."
    exit 1
}

Write-Host "Using MySQL from: $mysqlDir" -ForegroundColor Gray

# ---- read DB credentials from source env -----------------------------------
if (-not (Test-Path $SourceEnv)) {
    Write-Error "Source env file not found: $SourceEnv"
    exit 1
}

$hostName  = Get-EnvValue $SourceEnv "MYSQL_HOST"
$port      = Get-EnvValue $SourceEnv "MYSQL_PORT"
$user      = Get-EnvValue $SourceEnv "MYSQL_USER"
$password  = Get-EnvValue $SourceEnv "MYSQL_PASSWORD"
$envDb     = Get-EnvValue $SourceEnv "MYSQL_DB"

if (-not $SourceDb) { $SourceDb = $envDb }
if (-not $SourceDb) { $SourceDb = "asset_mngmnt" }

$mysqlExePath = Join-Path $mysqlDir "mysql.exe"

Write-Host "Source DB: $SourceDb" -ForegroundColor Cyan
Write-Host "Target DB: $TargetDb" -ForegroundColor Cyan

# ---- create target database ------------------------------------------------
Write-Host "`n>>> Creating database '$TargetDb'..." -ForegroundColor Yellow
& "$mysqlExePath" -h $hostName -P $port -u $user --password="$password" -e "CREATE DATABASE IF NOT EXISTS `"$TargetDb`" DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create database"; exit 1 }

# ---- import an existing dump -----------------------------------------------
if ($ImportFile) {
    if (-not (Test-Path $ImportFile)) {
        Write-Error "Import file not found: $ImportFile"
        exit 1
    }
    Write-Host ">>> Importing '$ImportFile' into '$TargetDb'..." -ForegroundColor Yellow
    $cmdLine = "`"$mysqlExePath`" -h $hostName -P $port -u $user --password=`"$password`" --default-character-set=utf8mb4 $TargetDb < `"$ImportFile`""
    & $env:ComSpec /c $cmdLine
    if ($LASTEXITCODE -ne 0) { Write-Error "Import failed"; exit 1 }
    Write-Host "`nLIVE database '$TargetDb' is ready (imported)." -ForegroundColor Green
    exit 0
}

# ---- schema + reference-data sync (keep existing target data) ---------------
if ($SchemaOnly) {
    $stamp = Get-Date -Format yyyyMMdd_HHmmss
    $schemaDump   = Join-Path $env:TEMP "asset_mngmnt_prod_schema_$stamp.sql"
    $processedDump = Join-Path $env:TEMP "asset_mngmnt_prod_schema_ready_$stamp.sql"
    $dataDump     = Join-Path $env:TEMP "asset_mngmnt_prod_refdata_$stamp.sql"

    # 1) Structure + routines + triggers (no data)
    Write-Host ">>> Dumping schema + routines from '$SourceDb' (no data)..." -ForegroundColor Yellow
    & "$mysqlDir\mysqldump.exe" -h $hostName -P $port -u $user --password="$password" `
        --no-create-db --no-data --routines --triggers --events `
        --set-gtid-purged=OFF --default-character-set=utf8mb4 `
        --result-file="$schemaDump" "$SourceDb"
    if ($LASTEXITCODE -ne 0) { Write-Error "Schema dump failed"; exit 1 }

    # 2) Rewrite so existing tables are never dropped/recreated (keeps data)
    Write-Host ">>> Preparing structure (keep existing tables/data)..." -ForegroundColor Yellow
    $prepared = foreach ($line in (Get-Content -Path $schemaDump -Encoding UTF8)) {
        if ($line -match '^DROP (TABLE|VIEW)') { continue }
        if ($line -match '^CREATE TABLE ') { $line -replace '^CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ' }
        else { $line }
    }
    [System.IO.File]::WriteAllLines($processedDump, $prepared, (New-Object System.Text.UTF8Encoding($false)))

    Write-Host ">>> Applying structure + routines to '$TargetDb'..." -ForegroundColor Yellow
    $cmdLine = "`"$mysqlExePath`" -h $hostName -P $port -u $user --password=`"$password`" --default-character-set=utf8mb4 $TargetDb < `"$processedDump`""
    & $env:ComSpec /c $cmdLine
    if ($LASTEXITCODE -ne 0) { Write-Error "Structure update failed"; exit 1 }

    # 3) Reference tables copied with data so local users/roles/permissions stay in sync
    $refTables = @(
        "users",
        "asset_mngmnt_roles",
        "role_permissions",
        "user_permissions",
        "custodians",
        "user_custodian_settings",
        "user_address"
    )

    Write-Host ">>> Syncing reference data into '$TargetDb'..." -ForegroundColor Yellow
    & "$mysqlDir\mysqldump.exe" -h $hostName -P $port -u $user --password="$password" `
        --no-create-db --no-create-info --insert-ignore --skip-triggers `
        --default-character-set=utf8mb4 `
        --result-file="$dataDump" "$SourceDb" $refTables
    if ($LASTEXITCODE -ne 0) { Write-Error "Reference data dump failed"; exit 1 }

    $cmdLine = "`"$mysqlExePath`" -h $hostName -P $port -u $user --password=`"$password`" --default-character-set=utf8mb4 $TargetDb < `"$dataDump`""
    & $env:ComSpec /c $cmdLine
    if ($LASTEXITCODE -ne 0) { Write-Error "Reference data sync failed"; exit 1 }

    Remove-Item $schemaDump, $processedDump, $dataDump -Force

    Write-Host "`nSchema + routines + reference data synced to '$TargetDb'." -ForegroundColor Green
    Write-Host "Existing table data in '$TargetDb' was preserved." -ForegroundColor Cyan
    Write-Host "Reference tables refreshed: $($refTables -join ', ')" -ForegroundColor Cyan
    Write-Host "Note: column changes to EXISTING tables still need their migration run manually:" -ForegroundColor Yellow
    Write-Host "  mysql -u root -p $TargetDb < db\migration_add_xxx.sql" -ForegroundColor White
    exit 0
}

# ---- dump source database (schema + data + routines) -----------------------
$tmpDump = ($null -ne $DumpOnly)
$dumpFile = $null
if ($tmpDump) {
    $dumpFile = $DumpOnly
} else {
    $dumpFile = Join-Path $env:TEMP "asset_mngmnt_prod_full_$(Get-Date -Format yyyyMMdd_HHmmss).sql"
}

Write-Host ">>> Dumping full copy of '$SourceDb'..." -ForegroundColor Yellow
& "$mysqlDir\mysqldump.exe" -h $hostName -P $port -u $user --password="$password" `
    --no-create-db --single-transaction --routines --triggers --events `
    --set-gtid-purged=OFF --default-character-set=utf8mb4 `
    --result-file="$dumpFile" "$SourceDb"
if ($LASTEXITCODE -ne 0) { Write-Error "Dump failed"; exit 1 }

# ---- dump-only mode ---------------------------------------------------------
if ($tmpDump) {
    Write-Host "`nDump exported to: $dumpFile" -ForegroundColor Green
    Write-Host "Transfer this file to the other computer and import it with:"
    Write-Host "  .\db\init_prod_db.ps1 -ImportFile $dumpFile"
    exit 0
}

# ---- restore into target ---------------------------------------------------
Write-Host ">>> Restoring into '$TargetDb'..." -ForegroundColor Yellow
$cmdLine = "`"$mysqlExePath`" -h $hostName -P $port -u $user --password=`"$password`" --default-character-set=utf8mb4 $TargetDb < `"$dumpFile`""
& $env:ComSpec /c $cmdLine
if ($LASTEXITCODE -ne 0) { Write-Error "Restore failed"; exit 1 }

Remove-Item $dumpFile -Force

Write-Host "`nLIVE database '$TargetDb' is ready." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run: npm run dev:live        (development, API on port 9999)" -ForegroundColor White
Write-Host "  2. Run: npm run build; npm run start:live   (production build, API on port 9999)" -ForegroundColor White
