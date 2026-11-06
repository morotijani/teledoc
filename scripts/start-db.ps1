Write-Host "Starting TeleDoc PostgreSQL 18 on port 5433..." -ForegroundColor Cyan
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "$PSScriptRoot\..\.pgdata" -l "$PSScriptRoot\..\.pgdata\server.log"
