@echo off
title Servidor Chat IA Fundacion A+
color 0b
cd /d "%~dp0backend_chat"

echo ================================================================
echo         SERVIDOR DE CHAT IA - FUNDACION A+ (PUERTO 8001)
echo ================================================================
echo.
echo Iniciando backend del Chat IA en http://127.0.0.1:8001 ...
echo Presiona Ctrl + C para detenerlo.
echo.

python -m uvicorn chat_backend:app --host 0.0.0.0 --port 8001 --reload

pause
