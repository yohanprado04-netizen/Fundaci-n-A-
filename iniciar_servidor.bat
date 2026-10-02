@echo off
title Servidor Web Fundacion A+
color 0b
cd /d "%~dp0"

echo ================================================================
echo          SERVIDOR FUNDACION A+ (WEB + CHAT INTELIGENTE)
echo ================================================================
echo.

:: Obtener la IP local de la maquina (Wi-Fi / Ethernet real)
set LOCAL_IP=
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1 | Get-NetIPAddress -AddressFamily IPv4).IPAddress" 2^>nul`) do (
    set LOCAL_IP=%%i
)
if "%LOCAL_IP%"=="" (
    for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "Default"') do (
        if not defined LOCAL_IP set LOCAL_IP=%%a
    )
)
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo  [+] Iniciando servicios de la Fundacion A+...
echo.
echo   * Aplicacion Web:
echo     Local:        http://localhost:8000
echo     Otra PC/WiFi: http://%LOCAL_IP%:8000
echo.
echo   * Servidor de Chat IA:
echo     Local:        http://localhost:8001
echo     Otra PC/WiFi: http://%LOCAL_IP%:8001
echo.
echo  ----------------------------------------------------------------
echo   REQUISITOS Y CONEXION EN RED LOCAL:
echo   1. MySQL debe estar activo en XAMPP.
echo   2. Si otra PC o celular no carga, ejecuta:
echo      "abrir_puerto_firewall.bat" (Ejecutar como Administrador).
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
