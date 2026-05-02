@echo off
cd /d c:\Users\User\Desktop\systems\asset_mngmnt\db
mysql asset_mngmnt < all_migrations.sql
echo Migrations complete!
pause
