@echo off
setlocal
set ROOT_DIR=%~dp0..
set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
set DB=asset_mngmnt_e2e

echo [start-server] Creating database %DB%...
%MYSQL% --force -u root -p"P@ssw0rd" -h localhost -P 3306 -e "CREATE DATABASE IF NOT EXISTS `%DB%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul

echo [start-server] Running migrations...
%MYSQL% --force -u root -p"P@ssw0rd" -h localhost -P 3306 %DB% < "%ROOT_DIR%\db\all_migrations_combined.sql" 2>nul

echo [start-server] Seeding data...
%MYSQL% --force -u root -p"P@ssw0rd" -h localhost -P 3306 %DB% < "%~dp0fixtures\seed.sql" 2>nul

echo [start-server] Starting server...
cd "%ROOT_DIR%"
set NODE_ENV=test
set MYSQL_DB=%DB%
set HTTP_PORT=6996
npx cross-env NODE_ENV=test MYSQL_DB=%DB% HTTP_PORT=6996 npm run dev --workspace=server
