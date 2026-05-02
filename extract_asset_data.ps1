$newDb = 'db4-30-26'
$oldDb = 'db4162026asstmngmnt'
$output = 'asset_data_import.sql'

# Table order respecting dependencies
$tables = @('companies', 'asset_mngmnt_locations', 'asset_mngmnt_location_rooms', 'asset_mngmnt_departments', 'asset_categories', 'asset_types', 'asset_brands', 'suppliers', 'assets')

# Get MySQL header from new db
$header = Get-Content "$newDb/asset_mngmnt_companies.sql" | Select-Object -First 18
$header | Out-File -FilePath $output -Encoding utf8

foreach ($table in $tables) {
    $newFile = "$newDb/asset_mngmnt_$table.sql"
    $oldFile = "$oldDb/asset_mngmnt_$table.sql"
    
    Write-Host "Processing $table..."
    
    # Get DROP TABLE and CREATE TABLE from new db
    $content = Get-Content $newFile
    $startIdx = ($content | Select-String -Pattern 'DROP TABLE IF EXISTS' | Select-Object -First 1).LineNumber - 1
    # Find the line with ENGINE=InnoDB and closing parenthesis
    $endIdx = ($content | Select-String -Pattern 'ENGINE=InnoDB' | Select-Object -First 1).LineNumber - 1
    $createSection = $content[$startIdx..$endIdx]
    
    # Add table structure comment before CREATE
    Add-Content -Path $output -Value "--"
    Add-Content -Path $output -Value "-- Table structure for table $table"
    Add-Content -Path $output -Value "--"
    Add-Content -Path $output -Value ""
    $createSection | Out-File -FilePath $output -Append -Encoding utf8
    
    # Get INSERT statements from old db
    $oldContent = Get-Content $oldFile
    $insertStart = ($oldContent | Select-String -Pattern 'LOCK TABLES' | Select-Object -First 1).LineNumber - 1
    $insertEnd = ($oldContent | Select-String -Pattern 'UNLOCK TABLES' | Select-Object -First 1).LineNumber - 1
    $insertSection = $oldContent[$insertStart..$insertEnd]
    
    # For assets table, we need to handle the schema difference (next_maintenance_date column)
    if ($table -eq 'assets') {
        # Extract column names from the new CREATE TABLE statement
        $columnNames = @()
        foreach ($line in $createSection) {
            if ($line -match '^\s*\`(\w+)\`') {
                $columnNames += $matches[1]
            }
        }
        
        # Build INSERT statement with explicit column names from new schema
        $colList = $columnNames -join '`, `'
        $modifiedInsert = @()
        
        foreach ($line in $insertSection) {
            if ($line -match 'INSERT INTO `assets` VALUES') {
                # Replace with explicit column names
                $modifiedInsert += "INSERT INTO `assets` (`$colList`) VALUES"
            } elseif ($line -match "^\(") {
                # This is a VALUES line - we need to add NULL for next_maintenance_date
                # The old schema has 42 columns, new has 43 (added next_maintenance_date after maintenance_schedule)
                # We'll split the values and insert NULL after the maintenance_schedule value (position 34)
                $values = $line -replace "^\(|\),?$", "" -split "',"
                
                # Insert NULL after position 34 (after maintenance_schedule, which is at index 33)
                if ($values.Count -eq 42) {
                    $values = $values[0..32] + $values[33] + "NULL" + $values[34..41]
                }
                
                # Rebuild the line
                $newLine = "(" + ($values -join "',") + ")," -replace "',NULL,'", "',NULL,'"
                $modifiedInsert += $newLine
            } else {
                $modifiedInsert += $line
            }
        }
        
        # Add data comment before INSERT
        Add-Content -Path $output -Value "--"
        Add-Content -Path $output -Value "-- Dumping data for table $table"
        Add-Content -Path $output -Value "--"
        Add-Content -Path $output -Value ""
        $modifiedInsert | Out-File -FilePath $output -Append -Encoding utf8
    } else {
        # Add data comment before INSERT
        Add-Content -Path $output -Value "--"
        Add-Content -Path $output -Value "-- Dumping data for table $table"
        Add-Content -Path $output -Value "--"
        Add-Content -Path $output -Value ""
        $insertSection | Out-File -FilePath $output -Append -Encoding utf8
    }
}

# Get MySQL footer from new db
$footer = Get-Content "$newDb/asset_mngmnt_companies.sql" | Select-Object -Last 9
$footer | Out-File -FilePath $output -Append -Encoding utf8

Write-Host "Done! Created $output"
