@echo off
title Servidor Web Fundacion A+
color 0b
cd /d "%~dp0"

echo ================================================================
echo          SERVIDOR FUNDACION A+ (WEB + CHAT INTELIGENTE)
echo ================================================================
echo.

:: Obtener la IP local de la maquina
set LOCAL_IP=
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "Default"') do (
    if not defined LOCAL_IP set LOCAL_IP=%%a
)
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo  [+] Iniciando servicios de la Fundacion A+...
echo.
echo   * Aplicacion Web:
echo     http://localhost:8000 (o http://%LOCAL_IP%:8000 en red WiFi)
echo.
echo   * Servidor de Chat IA:
echo     http://localhost:8001 (o http://%LOCAL_IP%:8001 en red WiFi)
echo.
echo  ----------------------------------------------------------------
echo   REQUISITOS:
echo   1. MySQL debe estar activo en XAMPP.
echo   2. Si te conectas desde el celular en WiFi, ejecuta
echo      "abrir_puerto_firewall.bat" como Administrador.
echo.
echo   Presiona Ctrl + C en esta ventana para apagar el servidor web.
echo ================================================================
echo.

:: 1. Iniciar backend de Chat IA (Python/FastAPI en puerto 8001)
echo [+] Levantando Chat IA en puerto 8001...
start "Chat IA Fundacion A+ (Puerto 8001)" cmd /c "cd /d "%~dp0backend_chat" && title Chat IA Fundacion A+ (Puerto 8001) && python -m uvicorn chat_backend:app --host 0.0.0.0 --port 8001"

:: 2. Abrir navegador en la plataforma
start http://localhost:8000

:: 3. Iniciar servidor PHP integrado en puerto 8000
echo [+] Servidor PHP web en ejecucion...
php -S 0.0.0.0:8000 router.php

pause
