$ErrorActionPreference = "Continue"
Set-Location "C:\Users\User\Documents\miguel_gis\segmentador_ccpc_zmg"
$log = "deploy\railway-retry.log"
Add-Content $log ("=== RESTART " + (Get-Date -Format o) + " ===")

for ($i = 1; $i -le 80; $i++) {
  $msg = (Get-Date -Format o) + " ATTEMPT $i"
  Add-Content $log $msg
  Write-Output $msg

  $out = cmd /c "railway init --name perfiles-ccpc-zmg --workspace 88b85d37-0758-46e0-b835-87749a00f2e4 --json 2>&1"
  $text = $out | Out-String
  Add-Content $log $text
  Write-Output $text

  if ($text -match '"id"') {
    Write-Output "RAILWAY_PROJECT_READY"
    Add-Content $log "RAILWAY_PROJECT_READY"
    powershell -NoProfile -ExecutionPolicy Bypass -File deploy\railway-deploy.ps1
    Write-Output "RAILWAY_DEPLOY_COMPLETE"
    Add-Content $log "RAILWAY_DEPLOY_COMPLETE"
    $domains = cmd /c "railway domain list --service web --json 2>&1"
    Add-Content $log ($domains | Out-String)
    Write-Output $domains
    break
  }

  if ($text -match "too quickly") {
    Start-Sleep -Seconds 40
    continue
  }

  # Pro still paused — wait 2 min
  Start-Sleep -Seconds 120
}

Write-Output "=== END ==="
Add-Content $log ("=== END " + (Get-Date -Format o) + " ===")
