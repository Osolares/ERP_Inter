param(
    [string]$DbName = "erp_intermotores_v14",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "admin",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PGPASSWORD = $DbPassword
$dbExists = psql -U $DbUser -h $DbHost -p $DbPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName';"
if ($dbExists.Trim() -eq "1") { Write-Host "✅ La base ya existe: $DbName" -ForegroundColor Green }
else { createdb -U $DbUser -h $DbHost -p $DbPort $DbName; Write-Host "✅ Base creada: $DbName" -ForegroundColor Green }
