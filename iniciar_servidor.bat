@echo off
title Servidor Web Fundacion A+
color 0b
cd /d "%~dp0"

echo ================================================================
echo            SERVIDOR WEB FUNDACION A+ (SIN APACHE)
echo ================================================================
echo.

:: Obtener la IP local de la maquina
set LOCAL_IP=
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "Default"') do (
    if not defined LOCAL_IP set LOCAL_IP=%%a
)
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo  [+] Servidor iniciado correctamente en todas las interfaces de red.
echo.
echo   * Acceso en esta computadora:
echo     http://localhost:8000
echo.
echo   * Acceso desde tu celular, tablet u otra PC en la misma red WiFi:
echo     http://%LOCAL_IP%:8000
echo.
echo  ----------------------------------------------------------------
echo   REQUISITOS:
echo   1. MySQL debe estar activo en XAMPP.
echo   2. Para conectar el celular en WiFi: ejecuta "abrir_puerto_firewall.bat"
echo      una sola vez si Windows Firewall bloquea la conexion.
echo.
echo   Presiona Ctrl + C en esta ventana para apagar el servidor.
echo ================================================================
echo.

:: Abrir el navegador en la pagina
start http://localhost:8000

:: Iniciar servidor PHP integrado
php -S 0.0.0.0:8000 router.php

pause
