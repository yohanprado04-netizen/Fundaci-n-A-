@echo off
title Habilitar Acceso en Red Local - Fundacion A+
color 0b
echo ================================================================
echo       CONFIGURAR FIREWALL DE WINDOWS (ACCESO DESDE CELULAR)
echo ================================================================
echo.
echo Esta herramienta autoriza los puertos 8000 (Web) y 8001 (Chat IA)
echo en el Firewall de Windows para que puedas usar la plataforma y
echo el chat desde tu celular o tablet conectado a la misma red WiFi.
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Solicitando permisos de Administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"Servidor Fundacion A+ (Puerto 8000)\" dir=in action=allow protocol=TCP localport=8000 & netsh advfirewall firewall add rule name=\"Servidor Chat IA Fundacion A+ (Puerto 8001)\" dir=in action=allow protocol=TCP localport=8001 & echo. & echo [+] REGLAS CREADAS CON EXITO. Ya puedes conectar tu celular al servidor y al chat. & echo. & pause' -Verb RunAs"
    exit /b
)

netsh advfirewall firewall add rule name="Servidor Fundacion A+ (Puerto 8000)" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="Servidor Chat IA Fundacion A+ (Puerto 8001)" dir=in action=allow protocol=TCP localport=8001
echo.
echo [+] REGLAS CREADAS CON EXITO. Los puertos 8000 y 8001 ya estan abiertos en tu red local.
echo.
pause
