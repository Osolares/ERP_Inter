# ERP Intermotores v14 - Validación básica antes de entregar ZIP
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$version = "14.4.0"

function OK($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function FAIL($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

Write-Host "ERP Intermotores - Quality Gate v$version" -ForegroundColor Cyan

$required = @(
  "backend/requirements.txt",
  "backend/.env",
  "backend/alembic.ini",
  "frontend/package.json",
  "frontend/src/app/features/inventory/inventory.component.ts",
  "dev.ps1",
  "README.md",
  "CHANGELOG.md"
)

foreach ($item in $required) {
  $path = Join-Path $root $item
  if (!(Test-Path $path)) { FAIL "Falta archivo requerido: $item" }
}
OK "Archivos requeridos presentes"

$readme = Get-Content (Join-Path $root "README.md") -Raw
if ($readme -notmatch $version) { FAIL "README no tiene versión $version" }
OK "README actualizado"

$changelog = Get-Content (Join-Path $root "CHANGELOG.md") -Raw
if ($changelog -notmatch $version) { FAIL "CHANGELOG no tiene versión $version" }
OK "CHANGELOG actualizado"

Push-Location (Join-Path $root "frontend")
npm run build
Pop-Location
OK "Angular compiló correctamente"

OK "Quality Gate finalizado"
