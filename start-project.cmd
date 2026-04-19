@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0run-project.ps1" %*
exit /b %ERRORLEVEL%
