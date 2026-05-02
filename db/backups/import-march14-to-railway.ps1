param(
  [string]$RailwayHost = "",
  [int]$RailwayPort = 3306,
  [string]$RailwayUser = "",
  [string]$RailwayPassword = "",
  [string]$RailwayDatabase = "",
  [string]$LocalHost = "localhost",
  [int]$LocalPort = 3306,
  [string]$LocalUser = "root",
  [string]$LocalPassword = "P@ssw0rd",
  [string]$LocalDatabase = "asset_mngmnt"
)

$ErrorActionPreference = "Stop"

function Require-Value {
  param([string]$Name, [string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required value: $Name"
  }
}

function Test-Command {
  param([string]$Cmd)
  if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
    throw "Command '$Cmd' is not installed or not in PATH."
  }
}

Test-Command "mysql"

Require-Value "RailwayHost" $RailwayHost
Require-Value "RailwayUser" $RailwayUser
Require-Value "RailwayPassword" $RailwayPassword
Require-Value "RailwayDatabase" $RailwayDatabase

$backupDir = Join-Path $PSScriptRoot "serverdbbackup/march14"
if (-not (Test-Path $backupDir)) {
  throw "Backup directory not found: $backupDir"
}

$files = Get-ChildItem -Path $backupDir -Filter "*.sql" | Sort-Object Name
if ($files.Count -eq 0) {
  throw "No .sql files found in $backupDir"
}

$routineFiles = $files | Where-Object { $_.Name -match "routines\.sql$" }
$normalFiles = $files | Where-Object { $_.Name -notmatch "routines\.sql$" }

Write-Host ""
Write-Host "=== Import target (Railway) ===" -ForegroundColor Cyan
Write-Host "Host: $RailwayHost"
Write-Host "Port: $RailwayPort"
Write-Host "User: $RailwayUser"
Write-Host "DB:   $RailwayDatabase"

Write-Host ""
Write-Host "=== Source backup directory ===" -ForegroundColor Cyan
Write-Host $backupDir
Write-Host ""

$env:MYSQL_PWD = $RailwayPassword
try {
  foreach ($file in $normalFiles) {
    Write-Host "Importing $($file.Name)..." -ForegroundColor Yellow
    $cmd = "mysql -h `"$RailwayHost`" -P $RailwayPort -u `"$RailwayUser`" `"$RailwayDatabase`" --default-character-set=utf8mb4 < `"$($file.FullName)`""
    cmd /c $cmd | Out-Null
  }

  foreach ($file in $routineFiles) {
    Write-Host "Importing routines file $($file.Name)..." -ForegroundColor Yellow
    $cmd = "mysql -h `"$RailwayHost`" -P $RailwayPort -u `"$RailwayUser`" `"$RailwayDatabase`" --default-character-set=utf8mb4 < `"$($file.FullName)`""
    cmd /c $cmd | Out-Null
  }

  Write-Host ""
  Write-Host "Import completed successfully." -ForegroundColor Green
  Write-Host "Verifying tables..." -ForegroundColor Cyan
  mysql -h $RailwayHost -P $RailwayPort -u $RailwayUser -D $RailwayDatabase -e "SHOW TABLES;" --default-character-set=utf8mb4
}
finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

