# ERP Intermotores v14 - Arranque automatico de desarrollo
# Ejecutar desde la raiz del proyecto:
# powershell -ExecutionPolicy Bypass -File .\dev.ps1

param(
    [string]$DbName = "erp_intermotores_v14",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "admin",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 4200,
    [switch]$NoBrowser,
    [switch]$ForceEnv
)

$ErrorActionPreference = "Stop"

function OK($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function WARN($msg) { Write-Host "[AVISO] $msg" -ForegroundColor Yellow }
function FAIL($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function INFO($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function EXISTS($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function FIRSTLINE($cmd, $arg) { try { return (& $cmd $arg 2>$null | Select-Object -First 1) } catch { return "No disponible" } }

function Write-EnvFile($path) {
@"
DATABASE_URL=postgresql+psycopg://$DbUser`:$DbPassword@$DbHost`:$DbPort/$DbName
SECRET_KEY=CAMBIA_ESTA_CLAVE_LOCAL_DEV
ACCESS_TOKEN_EXPIRE_MINUTES=1440
PROJECT_NAME=ERP Intermotores v14
API_V1_PREFIX=/api/v1
DEFAULT_TIMEZONE=America/Guatemala
DEFAULT_DATE_FORMAT=dd/MM/yyyy
DEFAULT_TIME_FORMAT=HH:mm:ss
DEFAULT_CURRENCY=GTQ
DEFAULT_TAX_RATE=12.0
DEFAULT_OFFER_DISCOUNT_PERCENT=10.0
COSTS_INCLUDE_TAX=true
CORS_ORIGINS=http://localhost:$FrontendPort
ENVIRONMENT=development
"@ | Set-Content -Path $path -Encoding UTF8
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkCyan
Write-Host "ERP Intermotores v15.0.0 - Entorno de desarrollo" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor DarkCyan

try {
    $root = Split-Path -Parent $MyInvocation.MyCommand.Path
    $backend = Join-Path $root "backend"
    $frontend = Join-Path $root "frontend"

    if (!(Test-Path $backend)) { throw "No existe la carpeta backend. Ejecuta este script desde la raiz del proyecto." }
    if (!(Test-Path $frontend)) { throw "No existe la carpeta frontend. Ejecuta este script desde la raiz del proyecto." }

    INFO "Verificando herramientas"
    if (!(EXISTS python)) { throw "Python no esta disponible en PATH." }
    OK "Python: $(FIRSTLINE python '--version')"
    if (!(EXISTS node)) { throw "Node.js no esta disponible en PATH." }
    OK "Node.js: $(FIRSTLINE node '--version')"
    if (!(EXISTS npm)) { throw "npm no esta disponible en PATH." }
    OK "npm: $(FIRSTLINE npm '--version')"
    if (!(EXISTS psql)) { throw "psql no esta disponible en PATH." }
    OK "PostgreSQL psql: $(FIRSTLINE psql '--version')"
    if (!(EXISTS createdb)) { throw "createdb no esta disponible en PATH." }
    OK "PostgreSQL createdb: $(FIRSTLINE createdb '--version')"

    if (EXISTS redis-cli) {
        try {
            $redisPing = redis-cli ping 2>$null
            if ($redisPing -eq "PONG") { OK "Redis activo" } else { WARN "Redis instalado, pero sin respuesta PONG. Por ahora es opcional." }
        } catch { WARN "Redis instalado, pero no respondio. Por ahora es opcional." }
    } else { WARN "Redis no detectado. Por ahora es opcional." }

    INFO "Verificando base de datos PostgreSQL"
    $env:PGPASSWORD = $DbPassword
    $dbExists = psql -U $DbUser -h $DbHost -p $DbPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName';" 2>$null
    if ($dbExists.Trim() -eq "1") { OK "Base de datos existente: $DbName" }
    else {
        WARN "La base no existe. Creando: $DbName"
        createdb -U $DbUser -h $DbHost -p $DbPort $DbName
        OK "Base de datos creada"
    }

    INFO "Preparando backend/.env"
    $envFile = Join-Path $backend ".env"
    $mustWriteEnv = $ForceEnv -or !(Test-Path $envFile)
    if (!$mustWriteEnv) {
        $currentEnv = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
        if ($currentEnv -notmatch "DATABASE_URL=") { $mustWriteEnv = $true }
    }
    if ($mustWriteEnv) { Write-EnvFile $envFile; OK "Archivo backend/.env creado o reparado" }
    else { OK "Archivo backend/.env existente" }

    INFO "Preparando backend"
    Push-Location $backend
    $venvPython = Join-Path $backend ".venv\Scripts\python.exe"
    $venvPip = Join-Path $backend ".venv\Scripts\pip.exe"
    $venvAlembic = Join-Path $backend ".venv\Scripts\alembic.exe"

    if ((Test-Path ".venv") -and !(Test-Path $venvPython)) {
        WARN "Se encontro .venv incompleto. Se eliminara para recrearlo correctamente."
        Remove-Item -Recurse -Force ".venv"
    }

    if (!(Test-Path $venvPython)) {
        WARN "Creando entorno virtual .venv. Esto puede tardar 1 a 3 minutos la primera vez."
        python -m venv .venv
        if (!(Test-Path $venvPython)) { throw "No se pudo crear .venv. Ejecuta manualmente: cd backend; python -m venv .venv" }
        OK "Entorno virtual creado"
    }
    else { OK "Entorno virtual existente y valido" }

    if (!(Test-Path $venvPip)) { throw "No se encontro pip dentro de .venv. Borra backend/.venv y vuelve a ejecutar, o crea el entorno manualmente." }
    if (!(Test-Path $venvAlembic)) { WARN "Alembic no encontrado aun; se instalara con requirements.txt." }

    & $venvPip install -r requirements.txt
    OK "Dependencias backend verificadas"
    & $venvAlembic upgrade head
    OK "Migraciones aplicadas correctamente"
    Pop-Location

    INFO "Preparando frontend"
    Push-Location $frontend
    if (!(Test-Path "node_modules")) { npm install; OK "Dependencias frontend instaladas" }
    else { OK "Dependencias frontend existentes" }
    Pop-Location

    INFO "Iniciando backend y frontend en ventanas separadas"
    $backendCmd = "cd /d `"$backend`" && .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port $BackendPort"
    $frontendCmd = "cd /d `"$frontend`" && npm start -- --host 0.0.0.0 --port $FrontendPort"
    Start-Process cmd.exe -ArgumentList "/k", $backendCmd
    Start-Process cmd.exe -ArgumentList "/k", $frontendCmd

    Start-Sleep -Seconds 4
    if (!$NoBrowser) {
        Start-Process "http://localhost:$FrontendPort"
        Start-Process "http://localhost:$BackendPort/docs"
    }

    Write-Host ""
    Write-Host "Estado del entorno" -ForegroundColor Cyan
    Write-Host "Backend:  http://localhost:$BackendPort/docs"
    Write-Host "Frontend: http://localhost:$FrontendPort"
    Write-Host "Base:     $DbName"
    Write-Host "Usuario:  $DbUser"
    Write-Host "Moneda:   GTQ"
    Write-Host "IVA:      12%"
    Write-Host "Fecha:    dd/MM/yyyy"
    OK "Proceso completado"
}
catch {
    Write-Host ""
    FAIL $_.Exception.Message
    Write-Host "El proceso se detuvo para evitar estados falsos de OK." -ForegroundColor Yellow
    exit 1
}
