$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root "backend"
Push-Location $backend
if (!(Test-Path ".venv")) { python -m venv .venv }
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\alembic.exe upgrade head
Pop-Location
Write-Host "✅ Migraciones aplicadas" -ForegroundColor Green
