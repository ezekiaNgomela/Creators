@echo off
setlocal
cd /d "%~dp0"

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":8081 .*LISTENING"') do (
  taskkill /F /PID %%p >nul 2>nul
)

start "Creators Web" cmd /k node "%~dp0scripts\serve-web-dist.cjs" 8081
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8081/"
