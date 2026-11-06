Write-Host "Stopping TeleDoc PostgreSQL 18..." -ForegroundColor Yellow
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" stop -D "$PSScriptRoot\..\.pgdata" -m fast
