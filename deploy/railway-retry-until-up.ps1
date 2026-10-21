$ErrorActionPreference = "Continue"
Set-Location "C:\Users\User\Documents\miguel_gis\segmentador_ccpc_zmg"
$log = "C:\Users\User\Documents\miguel_gis\segmentador_ccpc_zmg\deploy\railway-retry.log"
"=== START $(Get-Date -Format o) ===" | Out-File $log -Encoding utf8

for ($i = 1; $i -le 100; $i++) {
  $line = "$(Get-Date -Format o) ATTEMPT $i"
  Add-Content $log $line
  Write-Host $line

  $out = & railway init --name "perfiles-ccpc-zmg" --workspace "88b85d37-0758-46e0-b835-87749a00f2e4" --json 2>&1 | Out-String
  Add-Content $log $out
  Write-Host $out

  $linked = $false
  if ($LASTEXITCODE -eq 0 -and $out -match '"id"') { $linked = $true }

  if (-not $linked) {
    $st = & railway status --json 2>&1 | Out-String
    if ($st -match '"project"' -or ($st -match '"id"' -and $st -notmatch 'No linked')) {
      Add-Content $log $st
      $linked = $true
    }
  }

  if ($linked) {
    Add-Content $log "RAILWAY_PROJECT_READY"
    Write-Host "RAILWAY_PROJECT_READY"
    & powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\User\Documents\miguel_gis\segmentador_ccpc_zmg\deploy\railway-deploy.ps1" *>> $log 2>&1
    Add-Content $log "RAILWAY_DEPLOY_SCRIPT_DONE"
    Write-Host "RAILWAY_DEPLOY_SCRIPT_DONE"
    & railway domain list --service web --json 2>&1 | Tee-Object -FilePath $log -Append
    break
  }

  if ($out -match "too quickly") {
    Start-Sleep -Seconds 35
    continue
  }

  if ($out -notmatch "paused") {
    Add-Content $log "RAILWAY_STOP_UNEXPECTED"
    Write-Host "RAILWAY_STOP_UNEXPECTED"
    break
  }

  Start-Sleep -Seconds 120
}

Add-Content $log "=== END $(Get-Date -Format o) ==="
Write-Host "=== END ==="
