$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$frontend = Join-Path $root "frontend"
cd $frontend
npm start -- --host 0.0.0.0 --port 4200
