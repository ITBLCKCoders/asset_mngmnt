<# .SYNOPSIS
    Creates the asset_mngmnt_uat database and copies schema + reference data.
.DESCRIPTION
    Dumps schema (no data) + reference data from the dev DB and restores into
    a new UAT database.  Reference tables copied with data:
      users, role_permissions, custodians, companies,
      user_custodian_settings, user_permissions
    Auto-detects MySQL bin directory from common install paths or PATH.
    Run this BEFORE starting the UAT server.
#>

param(
    [string]$SourceEnv = (Join-Path $PSScriptRoot "..\server\.env"),
    [string]$SourceDb  = "asset_mngmnt",
    [string]$TargetDb  = "asset_mngmnt_uat"
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
$sourceDb  = Get-EnvValue $SourceEnv "MYSQL_DB"

if (-not $sourceDb) { $sourceDb = $SourceDb }

Write-Host "Source DB: $sourceDb" -ForegroundColor Cyan
Write-Host "Target DB: $TargetDb" -ForegroundColor Cyan

# ---- create target database ------------------------------------------------
Write-Host "`n>>> Creating database '$TargetDb'..." -ForegroundColor Yellow
& "$mysqlDir\mysql.exe" -h $hostName -P $port -u $user --password="$password" -e "CREATE DATABASE IF NOT EXISTS `"$TargetDb`" DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create database"; exit 1 }

# ---- reference tables that should carry data --------------------------------
$dataTables = @(
    "users",
    "role_permissions",
    "custodians",
    "companies",
    "user_custodian_settings",
    "user_permissions",
    "asset_mngmnt_departments"
)

# ---- dump schema (no data) from source -------------------------------------
Write-Host ">>> Dumping schema from '$sourceDb' (no data)..." -ForegroundColor Yellow
$dumpFile = Join-Path $env:TEMP "asset_mngmnt_uat_schema_$(Get-Date -Format yyyyMMdd_HHmmss).sql"

& "$mysqlDir\mysqldump.exe" -h $hostName -P $port -u $user --password="$password" --no-data --routines --triggers --events "$sourceDb" | Out-File -FilePath $dumpFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { Write-Error "Schema dump failed"; exit 1 }

# ---- append data for reference tables --------------------------------------
Write-Host ">>> Appending data for reference tables..." -ForegroundColor Yellow
$dataDumpFile = Join-Path $env:TEMP "asset_mngmnt_uat_data_$(Get-Date -Format yyyyMMdd_HHmmss).sql"

& "$mysqlDir\mysqldump.exe" -h $hostName -P $port -u $user --password="$password" --no-create-info --insert-ignore --skip-triggers "$sourceDb" $dataTables | Out-File -FilePath $dataDumpFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { Write-Error "Data dump failed"; exit 1 }

# ---- combine schema + data -------------------------------------------------
$combinedFile = Join-Path $env:TEMP "asset_mngmnt_uat_combined_$(Get-Date -Format yyyyMMdd_HHmmss).sql"
Get-Content $dumpFile, $dataDumpFile | Set-Content $combinedFile -Encoding utf8

Remove-Item $dumpFile -Force
Remove-Item $dataDumpFile -Force

# ---- restore into target ---------------------------------------------------
Write-Host ">>> Restoring into '$TargetDb'..." -ForegroundColor Yellow
Get-Content $combinedFile | & "$mysqlDir\mysql.exe" -h $hostName -P $port -u $user --password="$password" "$TargetDb"
if ($LASTEXITCODE -ne 0) { Write-Error "Restore failed"; exit 1 }

Remove-Item $combinedFile -Force

Write-Host "`nUAT database '$TargetDb' is ready." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Copy server/.env.uat -> server/.env  (or run: npm run dev:uat)" -ForegroundColor White
Write-Host "  2. Copy client/.env.uat -> client/.env  (or run: npm run dev:uat)" -ForegroundColor White
