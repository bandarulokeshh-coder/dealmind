# DealMind — local "single URL" mode.
#
# Builds the React app and serves it from FastAPI on one origin (http://localhost:8001),
# i.e. exactly what the deployed Render service does. Use this to rehearse the live
# demo, or expose it with a tunnel (e.g. `cloudflared tunnel --url http://localhost:8001`)
# when you want a public URL without deploying.
#
# The Vite dev server (npm run dev in frontend/) is faster for day-to-day editing;
# this script is for verifying the production/deploy path.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$py = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) { $py = "python" }

Write-Host "Building frontend..." -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend")
if (Test-Path "node_modules") {
    npm run build
} else {
    npm install
    npm run build
}
Pop-Location

Write-Host "Serving API + UI on http://localhost:8001" -ForegroundColor Green
Write-Host "Health: http://localhost:8001/api/health" -ForegroundColor DarkGray
Push-Location $root
& $py -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8001
Pop-Location
