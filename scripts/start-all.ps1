# TeleDoc Ghana - Unified Dev Environment Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🏥 Launching TeleDoc Ghana Ecosystem" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start PostgreSQL 18
Write-Host "`n[1/3] Ensuring PostgreSQL 18 is active on port 5433..." -ForegroundColor Yellow
$pgReady = & "C:\Program Files\PostgreSQL\18\bin\pg_isready.exe" -h 127.0.0.1 -p 5433
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting local database cluster..." -ForegroundColor Gray
    Start-Process -FilePath "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -ArgumentList "start", "-D", "$PSScriptRoot\..\.pgdata", "-l", "$PSScriptRoot\..\.pgdata\server.log" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Write-Host "✅ PostgreSQL 18 is running." -ForegroundColor Green

# 2. Instructions for API, Admin Portal, and Mobile
Write-Host "`n[2/3] Services Information:" -ForegroundColor Yellow
Write-Host "  • Backend API:        npm run dev:api (http://localhost:5000)" -ForegroundColor White
Write-Host "  • Super Admin Portal: npm --prefix apps/admin run dev (http://localhost:5173)" -ForegroundColor White
Write-Host "  • Mobile App:         npm --prefix apps/mobile start" -ForegroundColor White

Write-Host "`n[3/3] Ready for pairing and development!" -ForegroundColor Green
