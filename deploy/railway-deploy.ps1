# Despliegue Railway: Postgres + api + web (PostGIS via CREATE EXTENSION)
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\User\Documents\miguel_gis\segmentador_ccpc_zmg"

Write-Host "==> Project status"
$st = & railway status --json 2>&1 | Out-String
Write-Host $st
if ($st -match "No linked") {
  throw "No hay proyecto linkeado. Corre railway init primero."
}

function Ensure-Service([string]$name, [string[]]$addArgs) {
  $list = & railway service list --json 2>&1 | Out-String
  if ($list -match [regex]::Escape("`"$name`"")) {
    Write-Host "Service $name already exists"
    return
  }
  & railway add @addArgs --json
  if ($LASTEXITCODE -ne 0) { throw "Failed to add $name" }
}

Write-Host "==> Add Postgres"
Ensure-Service "Postgres" @("--database", "postgres")
Start-Sleep -Seconds 5

Write-Host "==> Add api + web"
Ensure-Service "api" @("--service", "api")
Ensure-Service "web" @("--service", "web")

Write-Host "==> Variables api"
railway variable set `
  "DATABASE_URL=`${{Postgres.DATABASE_URL}}" `
  "DATA_PROCESSED=/data/processed" `
  "DATA_RAW=/data/raw" `
  "N_CLUSTERS=5" `
  "CORS_ORIGINS=*" `
  --service api --skip-deploys

Write-Host "==> Variables web"
railway variable set `
  "API_UPSTREAM=http://`${{api.RAILWAY_PRIVATE_DOMAIN}}:`${{api.PORT}}" `
  --service web --skip-deploys

Write-Host "==> Deploy api"
Copy-Item -Force Dockerfile.api Dockerfile
railway up --service api --detach --ci --no-gitignore --message "deploy api"
Remove-Item -Force Dockerfile -ErrorAction SilentlyContinue

Write-Host "==> Domain api"
railway domain --service api --port 8000 --json

Write-Host "==> Deploy web"
Copy-Item -Force Dockerfile.web Dockerfile
railway up --service web --detach --ci --no-gitignore --message "deploy web"
Remove-Item -Force Dockerfile -ErrorAction SilentlyContinue

Write-Host "==> Domain web"
railway domain --service web --port 80 --json

Write-Host "==> Domains"
railway domain list --service web --json
railway domain list --service api --json
Write-Host "RAILWAY_DEPLOY_COMPLETE"
