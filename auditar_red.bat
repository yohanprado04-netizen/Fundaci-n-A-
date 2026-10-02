@echo off
title Auditoria de Red y Conexion - Fundacion A+
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0auditar_red.ps1"
echo.
pause
